import { Button } from '@material-ui/core';
import { DataGrid } from '@material-ui/data-grid';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import React, { Fragment, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// import Sidebar from './Sidebar';
import { clearErrors, deleteOrder, getAllOrders } from '../../actions/orderAction';
import { DELETE_ORDER_RESET } from '../../constants/orderConstants';
import MetaData from '../layout/MetaData';

import './ProductList.css';

const OrderList = () => {
const dispatch = useDispatch();
    const navigate = useNavigate();

    const { error, orders } = useSelector(state => state.allOrders);

    const { error: deleteError, isDeleted } = useSelector(state => state.order);

    const deleteOrderHandler = id => {
        dispatch(deleteOrder(id));
    };

    useEffect(() => {
        if (error) {
            toast.error(error);
            dispatch(clearErrors());
        }

        if (deleteError) {
            toast.error(deleteError);
            dispatch(clearErrors());
        }

        if (isDeleted) {
            toast.success('Order Deleted Successfully');
            navigate('/admin/orders');
            dispatch({ type: DELETE_ORDER_RESET });
        }

        dispatch(getAllOrders());
    }, [dispatch, error, deleteError, navigate, isDeleted]);

    const columns = [
        { field: 'id', headerName: 'Order ID', minWidth: 160, flex: 0.6 },
        {
            field: 'name', headerName: 'Product Name', minWidth: 200, flex: 0.6 },

        {
            field: 'status',
            headerName: 'Status',
            minWidth: 150,
            flex: 0.5,
            cellClassName: params => {
                return params.getValue(params.id, 'status') === 'Delivered'
                    ? 'greenColor'
                    : 'redColor';
            }
        },
        {
            field: 'itemsQty',
            headerName: 'Items Qty',
            type: 'number',
            minWidth: 150,
            flex: 0.4
        },

        {
            field: 'amount',
            headerName: 'Amount',
            type: 'number',
            minWidth: 270,
            flex: 0.5
        },

        {
            field: 'actions',
            flex: 0.3,
            headerName: 'Actions',
            minWidth: 150,
            type: 'number',
            sortable: false,
            renderCell: params => {
                return (
                    <Fragment>
                        <Link
                            to={`/admin/order/${params.getValue(
                                params.id,
                                'id'
                            )}`}
                        >
                            <EditIcon className='editIcon' />
                        </Link>

                        <Button
                            onClick={() =>
                                deleteOrderHandler(
                                    params.getValue(params.id, 'id')
                                )
                            }
                        >
                            <DeleteIcon className='deleteIcon' />
                        </Button>
                    </Fragment>
                );
            }
        }
    ];

    const rows = [];

    orders &&
        orders.forEach(item => {
            rows.push({
                id: item._id,
                name: item.orderItems[0].name,
                itemsQty: item.orderItems.length,
                amount: item.totalPrice,
                status: item.orderStatus
            });
        });

    return (
        <Fragment>
            <MetaData title={`ALL ORDERS - Admin`} />

            {/* <div className='dashboard'> */}
                {/* <Sidebar /> */}
                <div className='productListContainer'>
                    <h1 id='productListHeading'>ALL ORDERS</h1>

                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[10]}
                        disableSelectionOnClick
                        className='productListTable'
                        autoHeight
                    />
                </div>
            {/* </div> */}
        </Fragment>
    );
};

export default OrderList;
