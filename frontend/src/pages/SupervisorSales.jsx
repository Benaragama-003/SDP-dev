import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { TrendingUp, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dashboard.css';
import { formatDate } from '../utils/dateUtils';

const SupervisorSales = () => {
    const { user } = useAuth();

    // Mock daily sales data for the supervisor
    const supervisorSales = [
        {
            date: new Date().toISOString().split('T')[0],
            lorry: 'CAA-1234', // In real app, this would be from user's assigned lorry
            itemsCount: '45 cylinders',
            amount: 67500,
            items: [
                { size: '5kg', type: 'New', quantity: 20, price: 1500, amount: 30000 },
                { size: '12.5kg', type: 'Filled', quantity: 10, price: 3000, amount: 30000 },
                { size: '5kg', type: 'Filled', quantity: 5, price: 1500, amount: 7500 },
            ],
            details: { cash: 20000, cheque: 30000, credit: 17500 }
        }
    ];

    const stats = {
        revenue: 67500,
        orders: 5,
        cylinders: 45
    };

    const [selectedSale, setSelectedSale] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const handleViewClick = (sale) => {
        setSelectedSale(sale);
        setShowDetailModal(true);
    };

    return (
        <>
            <Sidebar />
            <div className="dashboard-container">
                <main className="dashboard-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Daily Sales</h1>
                            <p className="page-subtitle">Personal sales performance for today</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary">
                                <Download size={20} />
                                Export
                            </button>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#4facfe' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span className="stat-title">Today's Revenue</span>
                            </div>
                            <div className="stat-value">Rs. {stats.revenue.toLocaleString()}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#43e97b' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span className="stat-title">Today's Orders</span>
                            </div>
                            <div className="stat-value">{stats.orders}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#fa709a' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span className="stat-title">Cylinders Sold</span>
                            </div>
                            <div className="stat-value">{stats.cylinders}</div>
                        </div>
                    </div>

                    <div className="table-container" style={{ marginTop: '30px' }}>
                        <div className="table-header">
                            <h3 className="table-title">Performance Summary</h3>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Assigned Lorry</th>
                                    <th>Items Sold</th>
                                    <th>Total Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {supervisorSales.map((sale, index) => (
                                    <tr key={index}>
                                        <td>{formatDate(sale.date)}</td>
                                        <td>{sale.lorry}</td>
                                        <td>{sale.itemsCount}</td>
                                        <td>Rs. {sale.amount.toLocaleString()}</td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleViewClick(sale)} style={{ fontSize: '12px', padding: '5px 10px' }}>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Sales Detail Modal */}
                {showDetailModal && selectedSale && (
                    <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                        <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Sales Details</h2>
                                <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666' }}>Lorry Number</p>
                                        <p style={{ fontWeight: '600' }}>{selectedSale.lorry}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666' }}>Date</p>
                                        <p style={{ fontWeight: '600' }}>{formatDate(selectedSale.date)}</p>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Items Sold</h3>
                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '12px', marginBottom: '25px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                                                <th style={{ paddingBottom: '8px' }}>Item</th>
                                                <th style={{ paddingBottom: '8px' }}>Qty</th>
                                                <th style={{ paddingBottom: '8px', textAlign: 'right' }}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedSale.items.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: idx === selectedSale.items.length - 1 ? 'none' : '1px solid #eee' }}>
                                                    <td style={{ padding: '8px 0' }}>{item.size} {item.type}</td>
                                                    <td style={{ padding: '8px 0' }}>{item.quantity}</td>
                                                    <td style={{ padding: '8px 0', textAlign: 'right' }}>Rs. {item.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Payment Breakdown</h3>
                                <div style={{ background: '#fff', border: '1px solid #eee', padding: '20px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span>Cash Sales</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {selectedSale.details.cash.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span>Cheque Sales</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {selectedSale.details.cheque.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span>Credit Sales</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {selectedSale.details.credit.toLocaleString()}</span>
                                    </div>
                                    <hr style={{ borderTop: '2px solid #f5f5f5', margin: '15px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '18px', fontWeight: 'bold', color: '#101540' }}>
                                        <span>Total Collected</span>
                                        <span>Rs. {selectedSale.amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '20px', borderTop: '1px solid #eee' }}>
                                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setShowDetailModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SupervisorSales;
