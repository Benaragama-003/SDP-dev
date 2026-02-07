import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import '../../styles/Dashboard.css';
import { Package, Users, Truck, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { dashboardApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await dashboardApi.getStats();
                setStats(response.data.data);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };
        fetchStats();
    }, []);

    const getSalesTrend = async (req, res, next) => {
        try {
            const pool = await getConnection();
            const [rows] = await pool.execute(`
                SELECT 
                    DATE(created_at) as date,
                    SUM(total_amount) as sales
                FROM invoices
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            `);
            return successResponse(res, 200, 'Sales trend retrieved', rows);
        } catch (error) {
            next(error);
        }
    };

    return (
        <>
            <AdminSidebar />
            <div className="dashboard-container">
                <main className="dashboard-main">
                    <div className="dashboard-header">
                        <h1 className="header-title">Admin Dashboard</h1>
                        <p className="header-subtitle">Overview of your distribution management system</p>
                    </div>

                    <div className="dashboard-banner">
                        <div className="banner-content">
                            <h2 className="banner-title">Hidellana Distributors DMS</h2>
                            <p>Complete administrative control and monitoring</p>
                        </div>
                    </div>

                    <div className="stats-grid">
                        {stats && [
                            { title: 'Pending PO', value: stats.pendingPurchaseOrders, icon: <Package size={20} />, color: '#4facfe' },
                            { title: 'Active Dealers', value: stats.activeDealers, icon: <Users size={20} />, color: '#00f2fe' },
                            { title: 'Dispatches Today', value: stats.dispatchesToday, icon: <Truck size={20} />, color: '#43e97b' },
                            { title: 'Pending Credits', value: `Rs ${stats.pendingCredits?.toLocaleString() || 0}`, icon: <FileText size={20} />, color: '#fa709a' },
                            { title: 'Monthly Revenue', value: `Rs ${stats.monthlyRevenue?.toLocaleString() || 0}`, icon: <TrendingUp size={20} />, color: '#f093fb' },
                        ].map((stat, index) => (
                            <div key={index} className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                                        {stat.icon}
                                    </div>
                                    <span className="stat-title">{stat.title}</span>
                                </div>
                                <div className="stat-value">{stat.value}</div>
                            </div>
                        ))}
                    </div>
                    {stats?.stockByProduct && (
                        <div className="stock-section">
                            <h3>Current Inventory Stock</h3>
                            <div className="stock-grid">
                                {stats.stockByProduct.map((item, index) => (
                                    <div key={index} className="stock-card">
                                        <span className="stock-size">{item.cylinder_size}</span>
                                        <span className="stock-quantity">{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <h3 className="section-title">Quick Actions</h3>
                        <div className="actions-grid">
                            <button className="action-card" onClick={() => navigate('/admin/inventory')}>
                                <Package size={24} />
                                <span>Manage Inventory</span>
                            </button>
                            <button className="action-card" onClick={() => navigate('/admin/dealers')}>
                                <Users size={24} />
                                <span>Manage Dealers</span>
                            </button>
                            <button className="action-card" onClick={() => navigate('/admin/dispatch')}>
                                <Truck size={24} />
                                <span>Create Dispatch</span>
                            </button>
                            <button className="action-card" onClick={() => navigate('/admin/purchase-orders')}>
                                <FileText size={24} />
                                <span>New Purchase Order</span>
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminDashboard;
