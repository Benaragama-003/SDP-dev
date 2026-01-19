import React from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import '../../styles/Dashboard.css';
import { Package, Users, Truck, DollarSign, FileText, TrendingUp } from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const stats = [
        { title: 'Total Inventory', value: '3,450', icon: <Package size={20} />, color: '#4facfe' },
        { title: 'Active Dealers', value: '42', icon: <Users size={20} />, color: '#00f2fe' },
        { title: 'Active Supervisors', value: '8', icon: <Users size={20} />, color: '#43e97b' },
        { title: 'Dispatches Today', value: '12', icon: <Truck size={20} />, color: '#fa709a' },
        { title: 'Pending Invoices', value: '18', icon: <FileText size={20} />, color: '#f093fb' },
        { title: 'Monthly Revenue', value: 'Rs. 2.5M', icon: <TrendingUp size={20} />, color: '#4facfe' },
    ];

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
                        {stats.map((stat, index) => (
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
