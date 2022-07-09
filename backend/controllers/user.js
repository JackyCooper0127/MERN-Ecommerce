const ErrorHandler = require('../utils/errorhandler');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const User = require('../models/user');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const { cloudinary } = require('cloudinary');

// Register our user
exports.registerUser = catchAsyncErrors(async (req, res, next) => {

   let images = [];

   if(typeof req.body.images === 'string') {
      images.push(req.body.images);
   } else {
      images = req.body.images;
   }
   
   let avatarLink = [];

   for (let i = 0; i < images.length; i++) {
       const result = await cloudinary.v2.uploader.upload(images[i], {
           folder: 'avatar'
       });

       avatarLink.push({
           public_id: result.public_id,
           url: result.secure_url
       });
   }
   
   req.body.images = avatarLink;

   const { name, email, password } = req.body;
   const user = await User.create({
      name,
      email,
      password,
      avatarLink
   });

   sendToken(user, 201, res);
});

// Login User
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
   const { email, password } = req.body;

   // checking if user has given email and password both
   if (!email || !password) {
      return next(new ErrorHandler('Please Enter Email and Password', 400));
   }

   const user = await User.findOne({ email }).select('+password');
   if (!user) {
      return next(new ErrorHandler('Invalid Email or Password', 401));
   }

   const isPasswordMatched = await user.comparePassword(password);
   if (!isPasswordMatched) {
      return next(new ErrorHandler('Invalid Email or Password', 401));
   }

   sendToken(user, 200, res);
});

// logout User
exports.logout = catchAsyncErrors(async (req, res, next) => {
   res.cookie('token', null, {
      expires: new Date(Date.now()),
      httpOnly: true,
   });

   res.status(200).json({
      success: true,
      message: 'User logged out',
   });
});

// forgot password
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
   const user = await User.findOne({ email: req.body.email });

   if (!user) {
      return next(new ErrorHandler('User not found', 404));
   }

   // get reset password token
   const resetToken = user.getResetPasswordToken();

   await user.save({ validateBeforeSave: false });

   const resetPasswordURL = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

   try {
      await sendEmail({
          email: user.email,
          subject: `Password Recovery - Ecommerce`,
          html: `Your password reset token is:- \n\n ${resetPasswordURL} \n\n If you have not requested this email then, please ignore it.`
      });

      res.status(200).json({
         success: true,
         message: `Email sent to ${user.email} successfully.`,
      });
   } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorHandler(error.message, 500));
   }
});

// reset password
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
   // creating token hash
   const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

   const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
   });

   if (!user) {
      return next(
         new ErrorHandler(
            'Reset Password Token in invalid or has been expired!',
            400
         )
      );
   }

   if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler('Password does not match!', 400));
   }

   user.password = req.body.password;
   user.resetPasswordToken = undefined;
   user.resetPasswordExpire = undefined;

   await user.save();

   sendToken(user, 200, res);
});

// get User details
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
   const user = await User.findById(req.user.id);
   res.status(200).json({
      success: true,
      user,
   });
});

// update User password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
   const user = await User.findById(req.user.id).select('+password');

   const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

   if (!isPasswordMatched) {
      return next(new ErrorHandler('Old Password is incorrect', 400));
   }

   if (req.body.newPassword !== req.body.confirmPassword) {
      return next(new ErrorHandler('Password does not match', 400));
   }

   user.password = req.body.newPassword;

   await user.save();

   sendToken(user, 200, res);
});

// update User Profile
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email
  };
  
   if (req.body.avatar !== "") {
      const user = await User.findById(req.user.id);

      const imageId = user.avatar.public_id;

      await cloudinary.v2.uploader.destroy(imageId);
      // await cloudinary.uploader.destroy(imageId);

      await cloudinary.v2.uploader.upload(req.body.avatar, {
      // await cloudinary.uploader.upload(req.body.avatar, {
         folder: "avatars"
      });
      newUserData.avatar = {
         public_id: myCloud.public_id,
         url: myCloud.secure_url
      }
  }
   
  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false
  });

  res.status(200).json({
    success: true,
  });
});

// get all users --admin
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    users
  });
});

// get single user --admin
exports.getSingleUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler(`User does not exist with id: ${req.params.id}`))
  }

  res.status(200).json({
    success: true,
    user
  });
});

// update User Role --admin
exports.updateUserRole = catchAsyncErrors(async (req, res, next) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email, 
    role: req.body.role
  };
  
  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
    useFindAndModify: false
  });

  res.status(200).json({
    success: true,
  });
});

// delete User --admin
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorHandler(`User does not exist with Id: ${req.params.id}`));
   }
   
   const imageId = user.avatar.public_id;

   await cloudinary.v2.uploader.destroy(imageId);
   // await cloudinary.uploader.destroy(imageId);

  await user.remove();


  res.status(200).json({
    success: true,
    message: "User deleted successfully!"
  });
});