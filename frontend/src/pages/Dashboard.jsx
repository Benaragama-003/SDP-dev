import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './admin/AdminDashboard';
import Sidebar from '../components/Sidebar';
import '../styles/Dashboard.css';
import { CreditCard, Truck, Package, DollarSign, Store } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
    const { user, isAdmin } = useAuth();
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

    // Supervisor Dashboard
    const renderStats = [
        { title: 'Total Sales', value: stats?.totalSales?.toLocaleString(), icon: <CreditCard size={20} />, color: '#4facfe' },
        { title: 'Credit', value: stats?.credit?.toLocaleString(), icon: <DollarSign size={20} />, color: '#00f2fe' },
        { title: 'invoices', value: stats?.invoices?.toLocaleString(), icon: <Truck size={20} />, color: '#43e97b' },
        { title: 'Stock', value: stats?.stock?.toLocaleString(), icon: <Package size={20} />, color: '#fa709a' },
        { title: 'Active Dealers', value: stats?.activeDealers?.toLocaleString(), icon: <Store size={20} />, color: '#70faa7ff' },
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
                </main>
            </div>
        </>
    );
};

const getSalesTrendData = () => {
    const data = [];
    for (let i = 0; i < 7; i++) {
        data.push({
            date: new Date(Date.now() - (i * 86400000)).toISOString().split('T')[0],
            sales: Math.floor(Math.random() * 1000),
        });
    }
    return data;
};

export default Dashboard;

