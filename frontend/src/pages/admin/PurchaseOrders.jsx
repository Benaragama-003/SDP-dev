import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Eye, Package, Calendar, Truck } from 'lucide-react';
import '../../styles/Invoice.css';

const PurchaseOrders = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const [orders, setOrders] = useState([
        {
            id: 'PO-001',
            date: '2026-01-14',
            supplier: 'Laugfs Gas',
            items: '500 x 12.5kg Cylinders',
            total: 1500000,
            status: 'pending',
            details: {
                '5.0kg': { orderedFilled: 0, orderedNew: 0, receivedFilled: 0, receivedNew: 0 },
                '12.5kg': { orderedFilled: 500, orderedNew: 0, receivedFilled: 0, receivedNew: 0 },
                '37.5kg': { orderedFilled: 0, orderedNew: 0, receivedFilled: 0, receivedNew: 0 }
            }
        },
        {
            id: 'PO-002',
            date: '2026-01-12',
            supplier: 'Litro Gas',
            items: '200 x 37.5kg Cylinders',
            total: 1700000,
            status: 'approved',
            details: {
                '5.0kg': { orderedFilled: 0, orderedNew: 0, receivedFilled: 0, receivedNew: 0 },
                '12.5kg': { orderedFilled: 0, orderedNew: 0, receivedFilled: 0, receivedNew: 0 },
                '37.5kg': { orderedFilled: 200, orderedNew: 0, receivedFilled: 200, receivedNew: 0 }
            }
        },
        {
            id: 'PO-003',
            date: '2026-01-10',
            supplier: 'Laugfs Gas',
            items: '1000 x 5kg Cylinders',
            total: 750000,
            status: 'delivered',
            details: {
                '5.0kg': { orderedFilled: 1000, orderedNew: 0, receivedFilled: 1000, receivedNew: 0 },
                '12.5kg': { orderedFilled: 0, orderedNew: 0, receivedFilled: 0, receivedNew: 0 },
                '37.5kg': { orderedFilled: 0, orderedNew: 0, receivedFilled: 0, receivedNew: 0 }
            }
        },
    ]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalData, setModalData] = useState({});

    const filtered = orders.filter(o =>
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewClick = (order) => {
        setSelectedOrder(order);
        setModalData(JSON.parse(JSON.stringify(order.details))); // Deep copy
        setIsModalOpen(true);
    };

    const handleModalChange = (size, field, value) => {
        setModalData(prev => ({
            ...prev,
            [size]: {
                ...prev[size],
                [field]: Number(value)
            }
        }));
    };

    const handleUpdateOrder = () => {
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, details: modalData } : o));
        setIsModalOpen(false);
        alert(`Order ${selectedOrder.id} updated!`);
    };

    const handleStatusUpdate = (newStatus) => {
        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
        // Keep modal open or close based on preference, here we keep it open for consistency unless it's a final state
    };

    const navigate = useNavigate();

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
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>PO Number</th>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Overview</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((order) => (
                                    <tr key={order.id}>
                                        <td style={{ fontWeight: '600' }}>{order.id}</td>
                                        <td>{order.date}</td>
                                        <td>{order.supplier}</td>
                                        <td style={{ fontSize: '13px', color: '#666' }}>{order.items}</td>
                                        <td style={{ fontWeight: '500' }}>Rs. {order.total.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${order.status === 'delivered' ? 'badge-success' :
                                                order.status === 'approved' ? 'badge-warning' : 'badge-info'
                                                }`}>
                                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
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
                    </div>
                </main>

                {/* Harmonized PO Update Modal */}
                {isModalOpen && selectedOrder && (
                    <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '750px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>Update Purchase Order</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>ID: {selectedOrder.id} • Supplier: {selectedOrder.supplier}</p>
                                </div>
                                <button className="modal-close" onClick={() => setIsModalOpen(false)} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '0 30px 30px', maxHeight: '70vh', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', marginBottom: '15px', padding: '15px 0 10px', borderBottom: '2px solid #f9f9f9', textAlign: 'center', color: '#999', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', position: 'sticky', top: '0', backgroundColor: '#fff', zIndex: '1' }}>
                                    <div></div>
                                    <div style={{ color: '#101540' }}>Filled Qty</div>
                                    <div style={{ color: '#bfbf2a' }}>New Qty</div>
                                </div>

                                {['5.0kg', '12.5kg', '37.5kg'].map(size => (
                                    <div key={size} style={{ marginBottom: '25px', borderBottom: '1px solid #f5f5f5', paddingBottom: '15px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', alignItems: 'center', marginBottom: '10px' }}>
                                            <div style={{ color: '#666', fontSize: '14px', textAlign: 'right', paddingRight: '15px' }}>{size} - Ordered</div>
                                            <div style={{ background: '#f9f9f9', border: '1px solid #eee', padding: '10px', borderRadius: '10px', fontSize: '15px', color: '#333', textAlign: 'center', fontWeight: '600' }}>
                                                {modalData[size]?.orderedFilled || '0'}
                                            </div>
                                            <div style={{ background: '#f9f9f9', border: '1px solid #eee', padding: '10px', borderRadius: '10px', fontSize: '15px', color: '#333', textAlign: 'center', fontWeight: '600' }}>
                                                {modalData[size]?.orderedNew || '0'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
                                            <div style={{ color: '#101540', fontSize: '14px', fontWeight: 'bold', textAlign: 'right', paddingRight: '15px' }}>{size} - Received</div>
                                            <input
                                                type="number"
                                                value={modalData[size]?.receivedFilled || ''}
                                                onChange={(e) => handleModalChange(size, 'receivedFilled', e.target.value)}
                                                style={{ background: '#fff', border: '1px solid #ddd', padding: '12px', borderRadius: '12px', fontSize: '16px', textAlign: 'center', fontWeight: '600', width: '100%', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}
                                            />
                                            <input
                                                type="number"
                                                value={modalData[size]?.receivedNew || ''}
                                                onChange={(e) => handleModalChange(size, 'receivedNew', e.target.value)}
                                                style={{ background: '#fff', border: '1px solid #ddd', padding: '12px', borderRadius: '12px', fontSize: '16px', textAlign: 'center', fontWeight: '600', width: '100%', outline: 'none', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div style={{ marginTop: '25px', padding: '20px', backgroundColor: '#fcfcfc', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #f0f0f0' }}>
                                    <label style={{ color: '#101540', fontSize: '15px', fontWeight: 'bold', minWidth: '130px', textAlign: 'right' }}>Order Status:</label>
                                    <select
                                        style={{ padding: '12px 20px', flex: 1, border: '1px solid #ddd', borderRadius: '12px', fontSize: '16px', fontWeight: '500', background: '#fff', outline: 'none', cursor: 'pointer' }}
                                        value={selectedOrder.status}
                                        onChange={(e) => handleStatusUpdate(e.target.value)}
                                    >
                                        <option value="pending">Pending Review</option>
                                        <option value="approved">Approved</option>
                                        <option value="delivered">Received / Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div style={{ marginTop: '40px', display: 'flex', gap: '20px', position: 'sticky', bottom: '-2px', backgroundColor: '#fff', padding: '15px 0 0', borderTop: '1px solid #f0f0f0' }}>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        style={{ flex: 1, backgroundColor: '#dc3545', color: 'white', padding: '15px', borderRadius: '15px', fontSize: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(220, 53, 69, 0.2)' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdateOrder}
                                        style={{ flex: 1.5, backgroundColor: '#bfbf2a', color: 'white', padding: '15px', borderRadius: '15px', fontSize: '17px', fontWeight: 'bold', border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(191, 191, 42, 0.2)' }}
                                    >
                                        Update Purchase Order
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PurchaseOrders;
