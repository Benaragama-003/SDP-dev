import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Download, TrendingUp } from 'lucide-react';
import '../../styles/Dashboard.css';
import { formatDate } from '../../utils/dateUtils';
import { salesApi } from '../../services/api';
import DateInput from '../../components/DateInput';

const AdminSales = () => {
    const [dateRange, setDateRange] = useState('today');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState({ revenue: 0, orders: 0, cylinders: 0 });
    const [salesList, setSalesList] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const res = await salesApi.getAllSales({ range: dateRange, date: selectedDate });
                setStats(res.data.data.stats);
                setSalesList(res.data.data.sales);
            } catch (err) {
                console.error('Failed to fetch sales:', err);
            }
        };
        fetchSales();
    }, [dateRange, selectedDate]);

    const handleViewClick = (sale) => {
        setSelectedSale(sale);
        setShowDetailModal(true);
    };

    return (
        <>
            <AdminSidebar />
            <div className="dashboard-container">
                <main className="dashboard-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Sales Overview</h1>
                            <p className="page-subtitle">Track sales performance and metrics</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                                className="filter-select"
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                            >
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                            <div style={{ width: '150px' }}>
                            <DateInput
                                value={selectedDate}
                                onChange={(value) => {
                                    setSelectedDate(value);
                                    setDateRange('custom');
                                }}
                                className="filter-select"
                            />
                            </div>
                            <button className="btn btn-primary">
                                <Download size={20} />
                                Export Report
                            </button>
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#4facfe' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span className="stat-title">Total Revenue</span>
                            </div>
                            <div className="stat-value">Rs. {stats.revenue.toLocaleString()}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#43e97b' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span className="stat-title">Total Orders</span>
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
                            <h3 className="table-title">Recent Sales</h3>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Lorry</th>
                                    <th>Supervisor</th>
                                    <th>Items Sold</th>
                                    <th>Amount</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesList.map((sale, index) => (
                                    <tr key={index}>
                                        <td>{formatDate(sale.sale_date)}</td>
                                        <td>{sale.lorry}</td>
                                        <td>{sale.supervisor}</td>
                                        <td>{sale.cylinders_sold} cylinders</td>
                                        <td>Rs. {parseFloat(sale.total_amount).toLocaleString()}</td>
                                        <td>
                                            <button className="btn btn-sm btn-secondary" onClick={() => handleViewClick(sale)} style={{ fontSize: '12px', padding: '5px 10px' }}>
                                                View
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
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Sales Details</h2>
                                <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666' }}>Supervisor</p>
                                        <p style={{ fontWeight: '600' }}>{selectedSale.supervisor}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666' }}>Lorry Number</p>
                                        <p style={{ fontWeight: '600' }}>{selectedSale.lorry}</p>
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Payment Breakdown</h3>
                                <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span>Cash Sales</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {parseFloat(selectedSale.cash).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span>Cheque Sales</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {parseFloat(selectedSale.cheque).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <span>Credit Sales</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {parseFloat(selectedSale.credit).toLocaleString()}</span>
                                    </div>
                                    <hr style={{ borderTop: '1px solid #ddd', margin: '10px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}>
                                        <span>Total Sales</span>
                                        <span>Rs. {parseFloat(selectedSale.total_amount).toLocaleString()}</span>
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

export default AdminSales;
