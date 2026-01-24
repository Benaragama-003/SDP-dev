import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    FileText,
    Users,
    Truck,
    CreditCard,
    TrendingUp,
    Menu,
    X,
    LogOut,
    ChevronRight,
    Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleMobile = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    useEffect(() => {
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        return () => document.body.classList.remove('sidebar-collapsed');
    }, [isCollapsed]);

    const navItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/invoice/create', icon: FileText, label: 'Create Invoice' },
        { path: '/invoice/view', icon: FileText, label: 'Invoices' },
        { path: '/dealers', icon: Users, label: 'Dealers' },
        { path: '/credit/collection', icon: CreditCard, label: 'Credit Collection' },
        { path: '/dispatch/view', icon: Truck, label: 'Dispatch' },
        { path: '/sales/view', icon: TrendingUp, label: 'Daily Sales' },
        { path: '/account-settings', icon: Settings, label: 'Account Settings' },
    ];

    return (
        <>
            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleMobile}>
                <Menu size={24} />
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div className="mobile-overlay" onClick={toggleMobile} />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        {!isCollapsed && <span className="logo-text">Hidellana DMS</span>}
                        {isCollapsed && <span className="logo-short">HD</span>}
                    </div>
                    <button className="sidebar-toggle" onClick={toggleSidebar}>
                        <ChevronRight size={20} />
                    </button>
                    {isMobileOpen && (
                        <button className="mobile-close-btn" onClick={toggleMobile}>
                            <X size={24} />
                        </button>
                    )}
                </div>

                {user && !isCollapsed && (
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-role">{user.role}</div>
                        </div>
                    </div>
                )}

                <nav className="nav-menu">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => isMobileOpen && setIsMobileOpen(false)}
                        >
                            <item.icon size={20} className="nav-icon" />
                            {!isCollapsed && <span className="nav-label">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} className="nav-icon" />
                        {!isCollapsed && <span className="nav-label">Logout</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
