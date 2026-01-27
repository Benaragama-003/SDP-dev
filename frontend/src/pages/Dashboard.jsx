import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import { CreditCard, Truck, Package, DollarSign, Store } from 'lucide-react';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();

    // Render Admin Dashboard if user is admin
    if (isAdmin) {
        return <AdminDashboard />;
    }

    // Supervisor Dashboard
    const stats = [
        { title: 'Total Sales', value: 'Rs. 1,500,000', icon: <CreditCard size={20} />, color: '#4facfe' },
        { title: 'Credit', value: 'Rs. 45,000', icon: <DollarSign size={20} />, color: '#00f2fe' },
        { title: 'invoices', value: '56', icon: <Truck size={20} />, color: '#43e97b' },
        { title: 'Stock', value: '1,200', icon: <Package size={20} />, color: '#fa709a' },
        { title: 'Active Dealers', value: '366', icon: <Store size={20} />, color: '#70faa7ff' },
    ];

    return (
        <>
            <Sidebar />
            <div className="dashboard-container">
                <main className="dashboard-main">
                    <div className="dashboard-header">
                        <h1 className="header-title">Dashboard</h1>
                        <p className="header-subtitle">Welcome back! Here's your performance overview.</p>
                    </div>

                    <div className="dashboard-banner">
                        <div className="banner-content">
                            <h2 className="banner-title">Hidellana Distributors DMS</h2>
                            <p>Manage your distribution efficiently.</p>
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
                </main>
            </div>
        </>
    );
};

export default Dashboard;

