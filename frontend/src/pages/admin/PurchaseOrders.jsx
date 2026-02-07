import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Eye, Package, Loader2, CheckCircle, XCircle, Truck, Download } from 'lucide-react';
import { purchaseOrderApi } from '../../services/api';
import '../../styles/Invoice.css';

function PurchaseOrders() {
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [receivedItems, setReceivedItems] = useState([]);
    const [emptyStock, setEmptyStock] = useState({});
    
    // Export modal states
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        start_date: '',
        end_date: '',
        status: '',
        supplier: ''
    });
    
    const navigate = useNavigate();

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await purchaseOrderApi.getAll();
            setOrders(response.data.data.orders || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
            alert('Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleViewClick = async (order) => {
        try {
            setModalLoading(true);
            setIsModalOpen(true);
            const response = await purchaseOrderApi.getById(order.order_id);
            const orderData = response.data.data;
            setSelectedOrder(orderData);
            
            if (orderData.items) {
                setReceivedItems(orderData.items.map(item => ({
                    order_item_id: item.order_item_id,
                    product_id: item.product_id,
                    purchase_type: item.purchase_type,
                    ordered_quantity: item.ordered_quantity,
                    received_quantity: item.received_quantity || item.ordered_quantity
                })));
            }
            
            if (orderData.status === 'APPROVED') {
                try {
                    const stockResponse = await purchaseOrderApi.getEmptyStock();
                    const stockMap = {};
                    (stockResponse.data.data || []).forEach(s => {
                        stockMap[s.product_id] = s.empty_quantity;
                    });
                    setEmptyStock(stockMap);
                } catch (e) {
                    console.error('Failed to fetch empty stock:', e);
                }
            }
        } catch (error) {
            console.error('Failed to fetch order details:', error);
            alert('Failed to load order details');
            setIsModalOpen(false);
        } finally {
            setModalLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedOrder) return;
        if (!window.confirm('Are you sure you want to approve this order?')) return;
        
        try {
            setActionLoading(true);
            await purchaseOrderApi.approve(selectedOrder.order_id);
            alert('Order approved successfully!');
            setIsModalOpen(false);
            fetchOrders();
        } catch (error) {
            console.error('Failed to approve:', error);
            alert(error.response?.data?.message || 'Failed to approve order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReceive = async () => {
        if (!selectedOrder) return;
        
        for (const item of receivedItems) {
            if (item.purchase_type === 'FILLED') {
                const availableEmpty = emptyStock[item.product_id] || 0;
                if (item.received_quantity > availableEmpty) {
                    const product = selectedOrder.items.find(i => i.order_item_id === item.order_item_id);
                    alert(`Cannot receive ${item.received_quantity} refills for ${product?.cylinder_size || 'product'}. Only ${availableEmpty} empty cylinders available in stock.`);
                    return;
                }
            }
            if (item.received_quantity > item.ordered_quantity) {
                alert('Received quantity cannot exceed ordered quantity.');
                return;
            }
            if (item.received_quantity < 0) {
                alert('Received quantity cannot be negative.');
                return;
            }
        }
        
        if (!window.confirm('Mark this order as received? This will update inventory.')) return;
        
        try {
            setActionLoading(true);
            await purchaseOrderApi.receive(selectedOrder.order_id, {
                supplier_invoice_number: invoiceNumber || null,
                received_items: receivedItems
            });
            alert('Order received! Inventory has been updated.');
            setIsModalOpen(false);
            setInvoiceNumber('');
            setReceivedItems([]);
            fetchOrders();
        } catch (error) {
            console.error('Failed to receive:', error);
            alert(error.response?.data?.message || 'Failed to receive order');
        } finally {
            setActionLoading(false);
        }
    };

    const updateReceivedQuantity = (orderItemId, value) => {
        setReceivedItems(prev => prev.map(item => 
            item.order_item_id === orderItemId 
                ? { ...item, received_quantity: parseInt(value) || 0 }
                : item
        ));
    };

    const handleCancel = async () => {
        if (!selectedOrder) return;
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        
        try {
            setActionLoading(true);
            await purchaseOrderApi.cancel(selectedOrder.order_id);
            alert('Order cancelled successfully!');
            setIsModalOpen(false);
            fetchOrders();
        } catch (error) {
            console.error('Failed to cancel:', error);
            alert(error.response?.data?.message || 'Failed to cancel order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            setExportLoading(true);
            const params = {};
            
            if (exportFilters.start_date) params.start_date = exportFilters.start_date;
            if (exportFilters.end_date) params.end_date = exportFilters.end_date;
            if (exportFilters.status) params.status = exportFilters.status;
            if (exportFilters.supplier) params.supplier = exportFilters.supplier;

            const resp = await purchaseOrderApi.exportToExcel(params);
            
            const blob = new Blob([resp.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            setShowExportModal(false);
            setExportFilters({ start_date: '', end_date: '', status: '', supplier: '' });
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export purchase orders. Please try again.');
        } finally {
            setExportLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING: { bg: '#fef3c7', color: '#d97706' },
            APPROVED: { bg: '#dbeafe', color: '#2563eb' },
            RECEIVED: { bg: '#d1fae5', color: '#059669' },
            CANCELLED: { bg: '#fee2e2', color: '#dc2626' }
        };
        const style = styles[status] || styles.PENDING;
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: style.bg,
                color: style.color
            }}>
                {status}
            </span>
        );
    };

    const filtered = orders.filter(o =>
        o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

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
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
                                <Download size={20} />
                                Export Excel
                            </button>
                            <button className="btn btn-primary" onClick={() => navigate('/admin/purchase-orders/add')}>
                                <Plus size={20} />
                                New Purchase Order
                            </button>
                        </div>
                    </div>

                    {/* Export Modal */}
                    {showExportModal && (
                        <div className="modal-overlay" onClick={() => !exportLoading && setShowExportModal(false)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                                <div className="modal-header">
                                    <h2 className="modal-title">
                                        <Download size={24} style={{ marginRight: '10px' }} />
                                        Export Purchase Orders
                                    </h2>
                                    <button 
                                        className="modal-close" 
                                        onClick={() => !exportLoading && setShowExportModal(false)}
                                        disabled={exportLoading}
                                    >×</button>
                                </div>

                                <div className="modal-body" style={{ padding: '20px' }}>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                            From Date
                                        </label>
                                        <input
                                            type="date"
                                            value={exportFilters.start_date}
                                            onChange={e => setExportFilters(f => ({ ...f, start_date: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                            disabled={exportLoading}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                            To Date
                                        </label>
                                        <input
                                            type="date"
                                            value={exportFilters.end_date}
                                            onChange={e => setExportFilters(f => ({ ...f, end_date: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                            disabled={exportLoading}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                            Status (Optional)
                                        </label>
                                        <select
                                            value={exportFilters.status}
                                            onChange={e => setExportFilters(f => ({ ...f, status: e.target.value }))}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                            disabled={exportLoading}
                                        >
                                            <option value="">All Statuses</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="APPROVED">Approved</option>
                                            <option value="RECEIVED">Received</option>
                                            <option value="CANCELLED">Cancelled</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                            Supplier (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={exportFilters.supplier}
                                            onChange={e => setExportFilters(f => ({ ...f, supplier: e.target.value }))}
                                            placeholder="Enter supplier name"
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                            disabled={exportLoading}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer" style={{ 
                                    padding: '15px 20px', 
                                    display: 'flex', 
                                    justifyContent: 'flex-end', 
                                    gap: '10px',
                                    borderTop: '1px solid #eee' 
                                }}>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setShowExportModal(false)}
                                        disabled={exportLoading}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleExport}
                                        disabled={exportLoading}
                                        style={{ minWidth: '120px' }}
                                    >
                                        {exportLoading ? (
                                            <>
                                                <Loader2 className="spinner" size={18} />
                                                Exporting...
                                            </>
                                        ) : (
                                            <>
                                                <Download size={18} />
                                                Export
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Purchase Orders</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by PO number or supplier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px' }}>
                                <Loader2 className="spinner" size={40} />
                                <p style={{ marginTop: '15px', color: '#666' }}>Loading purchase orders...</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Order No</th>
                                        <th>Order Date</th>
                                        <th>Expected Delivery</th>
                                        <th>Supplier</th>
                                        <th>Total Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                                No purchase orders found
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((order) => (
                                            <tr key={order.order_id}>
                                                <td style={{ fontWeight: '600' }}>{order.order_number}</td>
                                                <td>{formatDate(order.order_date)}</td>
                                                <td>{formatDate(order.expected_delivery_date)}</td>
                                                <td>{order.supplier}</td>
                                                <td style={{ fontWeight: '600' }}>{formatCurrency(order.total_amount)}</td>
                                                <td>{getStatusBadge(order.status)}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '6px 12px' }}
                                                        onClick={() => handleViewClick(order)}
                                                    >
                                                        <Eye size={16} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>

                {/* View/Edit Modal */}
                {isModalOpen && (
                    <div className="modal-overlay" onClick={() => !actionLoading && setIsModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    <Package size={24} style={{ marginRight: '7px' }} />
                                    {selectedOrder?.order_number || 'Loading...'}
                                </h2>
                            </div>

                            {modalLoading ? (
                                <div style={{ textAlign: 'center', padding: '50px' }}>
                                    <Loader2 className="spinner" size={40} />
                                    <p style={{ marginTop: '15px' }}>Loading order details...</p>
                                </div>
                            ) : selectedOrder && (
                                <>
                                    <div className="modal-body" style={{ padding: '20px' }}>
                                        {/* Order Info */}
                                        <div style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(3, 1fr)', 
                                            gap: '15px',
                                            marginBottom: '20px',
                                            padding: '15px',
                                            backgroundColor: '#f8fafc',
                                            borderRadius: '8px'
                                        }}>
                                            <div>
                                                <small style={{ color: '#666' }}>Order Date</small>
                                                <p style={{ fontWeight: '600', margin: '4px 0 0' }}>{formatDate(selectedOrder.order_date)}</p>
                                            </div>
                                            <div>
                                                <small style={{ color: '#666' }}>Expected Delivery</small>
                                                <p style={{ fontWeight: '600', margin: '4px 0 0' }}>{formatDate(selectedOrder.expected_delivery_date)}</p>
                                            </div>
                                            <div>
                                                <small style={{ color: '#666' }}>Status</small>
                                                <p style={{ margin: '4px 0 0' }}>{getStatusBadge(selectedOrder.status)}</p>
                                            </div>
                                            <div>
                                                <small style={{ color: '#666' }}>Supplier</small>
                                                <p style={{ fontWeight: '600', margin: '4px 0 0' }}>{selectedOrder.supplier}</p>
                                            </div>
                                            <div>
                                                <small style={{ color: '#666' }}>Created By</small>
                                                <p style={{ fontWeight: '600', margin: '4px 0 0' }}>{selectedOrder.created_by_name || '-'}</p>
                                            </div>
                                            <div>
                                                <small style={{ color: '#666' }}>Total Amount</small>
                                                <p style={{ fontWeight: '600', margin: '4px 0 0', color: '#059669' }}>{formatCurrency(selectedOrder.total_amount)}</p>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <h4 style={{ marginBottom: '10px' }}>Order Items</h4>
                                        <table className="data-table" style={{ marginBottom: '20px' }}>
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Type</th>
                                                    <th>Ordered Qty</th>
                                                    <th>Received Qty</th>
                                                    {selectedOrder.status === 'APPROVED' && <th>Available Empty</th>}
                                                    <th>Unit Price</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedOrder.items?.map((item, idx) => {
                                                    const receivedItem = receivedItems.find(r => r.order_item_id === item.order_item_id);
                                                    const availableEmpty = emptyStock[item.product_id] || 0;
                                                    const maxReceivable = item.purchase_type === 'FILLED' 
                                                        ? Math.min(item.ordered_quantity, availableEmpty)
                                                        : item.ordered_quantity;
                                                    
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: '600' }}>{item.cylinder_size}</td>
                                                            <td>
                                                                <span style={{
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    fontSize: '11px',
                                                                    backgroundColor: item.purchase_type === 'FILLED' ? '#dbeafe' : '#fef3c7',
                                                                    color: item.purchase_type === 'FILLED' ? '#1d4ed8' : '#b45309'
                                                                }}>
                                                                    {item.purchase_type === 'FILLED' ? 'REFILL' : 'NEW'}
                                                                </span>
                                                            </td>
                                                            <td>{item.ordered_quantity}</td>
                                                            <td>
                                                                {selectedOrder.status === 'APPROVED' ? (
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={maxReceivable}
                                                                        value={receivedItem?.received_quantity ?? item.ordered_quantity}
                                                                        onChange={(e) => updateReceivedQuantity(item.order_item_id, e.target.value)}
                                                                        style={{
                                                                            width: '70px',
                                                                            padding: '6px',
                                                                            borderRadius: '4px',
                                                                            border: '1px solid #ddd',
                                                                            textAlign: 'center'
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    item.received_quantity || '-'
                                                                )}
                                                            </td>
                                                            {selectedOrder.status === 'APPROVED' && (
                                                                <td>
                                                                    {item.purchase_type === 'FILLED' ? (
                                                                        <span style={{
                                                                            color: availableEmpty < item.ordered_quantity ? '#dc2626' : '#059669',
                                                                            fontWeight: '600'
                                                                        }}>
                                                                            {availableEmpty}
                                                                            {availableEmpty < item.ordered_quantity && (
                                                                                <small style={{ display: 'block', fontSize: '10px' }}>Insufficient</small>
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: '#666' }}>N/A</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            <td>{formatCurrency(item.unit_price)}</td>
                                                            <td style={{ fontWeight: '600' }}>{formatCurrency(item.total_price)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Supplier Invoice (for receiving) */}
                                        {selectedOrder.status === 'APPROVED' && (
                                            <div style={{ marginBottom: '15px' }}>
                                                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                                    Supplier Invoice Number (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={invoiceNumber}
                                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                                    placeholder="Enter supplier invoice number"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '14px'
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* Status-specific info */}
                                        {selectedOrder.status === 'RECEIVED' && (
                                            <div style={{ 
                                                padding: '12px', 
                                                backgroundColor: '#d1fae5', 
                                                borderRadius: '8px',
                                                marginTop: '15px'
                                            }}>
                                                <p style={{ margin: 0, color: '#065f46' }}>
                                                    <strong>Received on:</strong> {formatDate(selectedOrder.actual_delivery_date)} by {selectedOrder.received_by_name}
                                                    {selectedOrder.supplier_invoice_number && (
                                                        <> | <strong>Invoice #:</strong> {selectedOrder.supplier_invoice_number}</>
                                                    )}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="modal-footer" style={{ 
                                        padding: '15px 20px', 
                                        display: 'flex', 
                                        justifyContent: 'flex-end', 
                                        gap: '10px',
                                        borderTop: '1px solid #eee' 
                                    }}>
                                        {selectedOrder.status === 'PENDING' && (
                                            <>
                                                <button 
                                                    className="btn btn-danger" 
                                                    onClick={handleCancel}
                                                    disabled={actionLoading}
                                                    style={{ backgroundColor: '#dc2626' }}
                                                >
                                                    <XCircle size={18} />
                                                    Cancel Order
                                                </button>
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={handleApprove}
                                                    disabled={actionLoading}
                                                    style={{ backgroundColor: '#059669' }}
                                                >
                                                    <CheckCircle size={18} />
                                                    Approve
                                                </button>
                                            </>
                                        )}
                                        {selectedOrder.status === 'APPROVED' && (
                                            <>
                                                <button 
                                                    className="btn btn-danger" 
                                                    onClick={handleCancel}
                                                    disabled={actionLoading}
                                                    style={{ backgroundColor: '#dc2626' }}
                                                >
                                                    <XCircle size={18} />
                                                    Cancel Order
                                                </button>
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={handleReceive}
                                                    disabled={actionLoading}
                                                    style={{ backgroundColor: '#059669' }}
                                                >
                                                    <Truck size={18} />
                                                    Mark as Received
                                                </button>
                                            </>
                                        )}
                                        {(selectedOrder.status === 'RECEIVED' || selectedOrder.status === 'CANCELLED') && (
                                            <button 
                                                className="btn btn-secondary" 
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                Close
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default PurchaseOrders;