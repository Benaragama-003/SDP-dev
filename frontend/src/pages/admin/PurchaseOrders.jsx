import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Eye, Loader } from 'lucide-react';
import '../../styles/Invoice.css';
import { formatDate } from '../../utils/dateUtils';
import { purchaseOrderApi } from '../../services/api';

const PurchaseOrders = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [receivedItems, setReceivedItems] = useState([]);
    const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
    const navigate = useNavigate();

    // Fetch all purchase orders from API
    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await purchaseOrderApi.getAll();
            if (response.data?.success) {
                setOrders(response.data.data.orders || []);
            }
        } catch (error) {
            console.error('Failed to fetch purchase orders:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Fetch single PO with items for the modal
    const handleViewClick = async (order) => {
        try {
            setModalLoading(true);
            setIsModalOpen(true);
            const response = await purchaseOrderApi.getById(order.order_id);
            if (response.data?.success) {
                const fullOrder = response.data.data;
                setSelectedOrder(fullOrder);
                // Initialize received items for receive form
                setReceivedItems(
                    (fullOrder.items || []).map(item => ({
                        order_item_id: item.order_item_id,
                        received_quantity: item.received_quantity || item.ordered_quantity
                    }))
                );
                setSupplierInvoiceNumber(fullOrder.supplier_invoice_number || '');
            }
        } catch (error) {
            console.error('Failed to fetch order details:', error);
        } finally {
            setModalLoading(false);
        }
    };

    // Handle approve
    const handleApprove = async () => {
        if (!selectedOrder) return;
        try {
            setActionLoading(true);
            await purchaseOrderApi.approve(selectedOrder.order_id);
            await fetchOrders();
            setIsModalOpen(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to approve');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle receive
    const handleReceive = async () => {
        if (!selectedOrder) return;
        try {
            setActionLoading(true);
            await purchaseOrderApi.receive(selectedOrder.order_id, {
                received_items: receivedItems,
                supplier_invoice_number: supplierInvoiceNumber
            });
            await fetchOrders();
            setIsModalOpen(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to receive');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle cancel
    const handleCancel = async () => {
        if (!selectedOrder || !window.confirm('Are you sure you want to cancel this order?')) return;
        try {
            setActionLoading(true);
            await purchaseOrderApi.cancel(selectedOrder.order_id);
            await fetchOrders();
            setIsModalOpen(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to cancel');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const map = {
            'PENDING': 'badge-info',
            'APPROVED': 'badge-warning',
            'RECEIVED': 'badge-success',
            'CANCELLED': 'badge-danger'
        };
        return map[status] || 'badge-info';
    };

    const getOverview = (order) => {
        // Build a summary from total_amount and item count
        return `${order.supplier || 'Laugfs Gas'}`;
    };

    const filtered = orders.filter(o =>
        (o.order_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <AdminSidebar />
            <div className="invoice-container">
                <main className="invoice-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Purchase Orders</h1>
                            <p className="page-subtitle">Manage and track company purchase orders</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate('/admin/purchase-orders/add')}>
                            <Plus size={20} />
                            Create New PO
                        </button>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Recent Orders</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by supplier or PO..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                                <Loader size={28} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                                <p style={{ marginTop: '12px' }}>Loading purchase orders...</p>
                            </div>
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#999' }}>
                                <p>No purchase orders found.</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>PO Number</th>
                                        <th>Date</th>
                                        <th>Supplier</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((order) => (
                                        <tr key={order.order_id}>
                                            <td style={{ fontWeight: '600' }}>{order.order_number}</td>
                                            <td>{formatDate(order.order_date)}</td>
                                            <td>{order.supplier || 'Laugfs Gas'}</td>
                                            <td style={{ fontWeight: '500' }}>Rs. {parseFloat(order.total_amount || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadge(order.status)}`}>
                                                    {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button className="action-btn action-btn-view" onClick={() => handleViewClick(order)}>
                                                        <Eye size={16} /> Manage
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>

                {/* PO Detail Modal */}
                {isModalOpen && (
                    <div className="modal-overlay" onClick={() => !actionLoading && setIsModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '750px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>
                                        Purchase Order Details
                                    </h1>
                                    {selectedOrder && (
                                        <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                                            {selectedOrder.order_number} • {selectedOrder.supplier || 'Laugfs Gas'} •{' '}
                                            <span className={`badge ${getStatusBadge(selectedOrder.status)}`} style={{ fontSize: '11px' }}>
                                                {selectedOrder.status}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <button className="modal-close" onClick={() => !actionLoading && setIsModalOpen(false)} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '0 30px 30px', maxHeight: '70vh', overflowY: 'auto' }}>
                                {modalLoading ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                                        <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                        <p style={{ marginTop: '10px' }}>Loading order details...</p>
                                    </div>
                                ) : selectedOrder ? (
                                    <>
                                        {/* Order Info */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}>
                                            <div>
                                                <span style={{ color: '#999', fontSize: '12px', textTransform: 'uppercase' }}>Order Date</span>
                                                <p style={{ margin: '4px 0 0', fontWeight: '600' }}>{formatDate(selectedOrder.order_date)}</p>
                                            </div>
                                            <div>
                                                <span style={{ color: '#999', fontSize: '12px', textTransform: 'uppercase' }}>Expected Delivery</span>
                                                <p style={{ margin: '4px 0 0', fontWeight: '600' }}>{formatDate(selectedOrder.expected_delivery_date)}</p>
                                            </div>
                                            <div>
                                                <span style={{ color: '#999', fontSize: '12px', textTransform: 'uppercase' }}>Created By</span>
                                                <p style={{ margin: '4px 0 0', fontWeight: '600' }}>{selectedOrder.created_by_name || '-'}</p>
                                            </div>
                                            <div>
                                                <span style={{ color: '#999', fontSize: '12px', textTransform: 'uppercase' }}>Total Amount</span>
                                                <p style={{ margin: '4px 0 0', fontWeight: '600', color: '#101540' }}>Rs. {parseFloat(selectedOrder.total_amount || 0).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Items Table */}
                                        <h3 style={{ margin: '20px 0 12px', fontSize: '16px', color: '#101540' }}>Order Items</h3>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
                                                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #eee' }}>Product</th>
                                                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #eee' }}>Type</th>
                                                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Ordered</th>
                                                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #eee', textAlign: 'center' }}>Received</th>
                                                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Unit Price</th>
                                                    <th style={{ padding: '10px 12px', borderBottom: '2px solid #eee', textAlign: 'right' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedOrder.items || []).map((item, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '10px 12px', fontWeight: '600' }}>{item.cylinder_size || item.product_code}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', backgroundColor: item.purchase_type === 'FILLED' ? '#dbeafe' : '#dcfce7', color: item.purchase_type === 'FILLED' ? '#1d4ed8' : '#166534' }}>
                                                                {item.purchase_type}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.ordered_quantity}</td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                            {selectedOrder.status === 'APPROVED' ? (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={item.ordered_quantity}
                                                                    value={receivedItems.find(ri => ri.order_item_id === item.order_item_id)?.received_quantity ?? item.ordered_quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        setReceivedItems(prev => prev.map(ri =>
                                                                            ri.order_item_id === item.order_item_id ? { ...ri, received_quantity: val } : ri
                                                                        ));
                                                                    }}
                                                                    style={{ width: '70px', padding: '6px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}
                                                                />
                                                            ) : (
                                                                item.received_quantity || '-'
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>Rs. {parseFloat(item.unit_price).toLocaleString()}</td>
                                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600' }}>Rs. {parseFloat(item.total_price).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Supplier Invoice Number (for receiving) */}
                                        {selectedOrder.status === 'APPROVED' && (
                                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
                                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Supplier Invoice Number</label>
                                                <input
                                                    type="text"
                                                    value={supplierInvoiceNumber}
                                                    onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                                                    placeholder="Enter supplier invoice number..."
                                                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div style={{ marginTop: '25px', display: 'flex', gap: '12px', paddingTop: '15px', borderTop: '1px solid #f0f0f0' }}>
                                            {selectedOrder.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={handleApprove}
                                                        disabled={actionLoading}
                                                        style={{ flex: 1, backgroundColor: '#059669', color: 'white', padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                                                    >
                                                        {actionLoading ? 'Processing...' : '✓ Approve Order'}
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        disabled={actionLoading}
                                                        style={{ flex: 0.6, backgroundColor: '#dc2626', color: 'white', padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                            {selectedOrder.status === 'APPROVED' && (
                                                <>
                                                    <button
                                                        onClick={handleReceive}
                                                        disabled={actionLoading}
                                                        style={{ flex: 1, backgroundColor: '#bfbf2a', color: 'white', padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                                                    >
                                                        {actionLoading ? 'Processing...' : '📥 Mark as Received'}
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        disabled={actionLoading}
                                                        style={{ flex: 0.6, backgroundColor: '#dc2626', color: 'white', padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                            {(selectedOrder.status === 'RECEIVED' || selectedOrder.status === 'CANCELLED') && (
                                                <button
                                                    onClick={() => setIsModalOpen(false)}
                                                    style={{ flex: 1, backgroundColor: '#6b7280', color: 'white', padding: '13px', borderRadius: '12px', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                                >
                                                    Close
                                                </button>
                                            )}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
};

export default PurchaseOrders;
