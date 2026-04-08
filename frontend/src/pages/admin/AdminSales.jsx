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
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        start_date: '',
        end_date: ''
    });
    useEffect(() => {
        const fetchSales = async () => {
            try {
                // Only send 'date' when user picked a specific date (custom range)
                const params = dateRange === 'custom'
                    ? { range: 'custom', date: selectedDate }
                    : { range: dateRange };
                const res = await salesApi.getAllSales(params);
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

    const handleExport = async () => {
        try {
            if (!exportFilters.start_date || !exportFilters.end_date) {
                alert("Please select both start and end dates");
                return;
            }
            if (new Date(exportFilters.start_date) > new Date(exportFilters.end_date)) {
                alert("From Date cannot be later than To Date");
                return;
            }
            setExportLoading(true);
            const response = await salesApi.exportToExcel(exportFilters.start_date, exportFilters.end_date);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `sales_report_${exportFilters.start_date}_to_${exportFilters.end_date}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setShowExportModal(false);
        } catch (error) {
            console.error('Export failed:', error);
            const errorMessage = error.response?.data?.message || 'Failed to export sales list';
            alert(errorMessage);
        } finally {
            setExportLoading(false);
        }
    };

    return (
        <>
            <AdminSidebar />
            <div className="dashboard-container">
                <main className="dashboard-main">
                    <div className="page-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div>
                                <h1 className="page-title">Sales Overview</h1>
                                <p className="page-subtitle">Track sales performance and metrics</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => setShowExportModal(true)}>
                                <Download size={20} />
                                Export Report
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
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
                                    <th>Dispatch No</th>
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
                                        <td>{formatDate(sale.sale_date || sale.dispatch_date)}</td>
                                        <td><span className="badge badge-secondary">{sale.dispatch_no || sale.dispatch_id}</span></td>
                                        <td>{sale.lorry}</td>
                                        <td>{sale.supervisor || sale.supervisor_name}</td>
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

                {/* Export Modal */}
                {showExportModal && (
                    <div className="modal-overlay" onClick={() => !exportLoading && setShowExportModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    <Download size={24} style={{ marginRight: '10px' }} />
                                    Export Sales
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
                                        max={new Date().toISOString().split('T')[0]}
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
                                        max={new Date().toISOString().split('T')[0]}
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
                                        'Exporting...'
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
            </div>
        </>
    );
};

export default AdminSales;
