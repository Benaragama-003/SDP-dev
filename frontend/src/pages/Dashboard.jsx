import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import { CreditCard, Truck, Package, DollarSign, Store } from 'lucide-react';
import { dashboardApi } from '../services/api';

const Dashboard = () => {
    const { isAdmin } = useAuth();
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

    // Render Admin Dashboard if user is admin
    if (isAdmin) {
        return <AdminDashboard />;
    }

    const renderStats = [
        { title: 'Monthly Sales', value: stats?.monthlySales?.toLocaleString() || '0', icon: <CreditCard size={20} />, color: '#4facfe' },
        { title: 'Credits to Collect', value: stats?.creditsToCollect?.toLocaleString() || '0', icon: <DollarSign size={20} />, color: '#00f2fe' },
        { title: 'Total Invoices', value: stats?.totalInvoices?.toLocaleString() || '0', icon: <Truck size={20} />, color: '#43e97b' },
        { title: 'Active Dealers', value: stats?.activeDealers?.toLocaleString() || '0', icon: <Store size={20} />, color: '#70faa7ff' },
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
                        {renderStats.map((stat, index) => (
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
                </main>
            </div>
        </>
    );
};

export default Dashboard;

