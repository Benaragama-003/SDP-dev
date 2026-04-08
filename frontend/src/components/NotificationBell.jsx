import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationApi } from '../services/api';
import '../styles/Notification.css';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationApi.getAll({ limit: 25 });
            if (response.data?.success) {
                setNotifications(response.data.data.notifications || []);
                setUnreadCount(response.data.data.unread_count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications(prev =>
                prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    };

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    };

    const getTypeIcon = (type) => {
        const icons = {
            PO_CREATED: '📦', PO_APPROVED: '✅', PO_RECEIVED: '📥', PO_CANCELLED: '❌',
            DISPATCH_CREATED: '🚛', DISPATCH_STARTED: '🟢', DISPATCH_UNLOAD_REQUESTED: '⏳', DISPATCH_UNLOADED: '✅',
            INVOICE_CREATED: '🧾', INVOICE_CANCELLED: '🚫',
            DAMAGE_REPORTED: '⚠️', LOW_STOCK: '📉',
            CREDIT_OVERDUE: '🔴', CHEQUE_RETURNED: '💳',
            MAINTENANCE_DUE: '🔧', USER_PENDING: '👤',
        };
        return icons[type] || '🔔';
    };

    const getTypeDot = (type) => {
        const colors = {
            PO_CREATED: '#6366f1', PO_APPROVED: '#059669', PO_RECEIVED: '#0891b2', PO_CANCELLED: '#dc2626',
            DISPATCH_CREATED: '#7c3aed', DISPATCH_STARTED: '#059669', DISPATCH_UNLOAD_REQUESTED: '#d97706', DISPATCH_UNLOADED: '#059669',
            INVOICE_CREATED: '#6366f1', INVOICE_CANCELLED: '#dc2626',
            DAMAGE_REPORTED: '#ea580c', LOW_STOCK: '#dc2626',
            CREDIT_OVERDUE: '#dc2626', CHEQUE_RETURNED: '#dc2626',
            MAINTENANCE_DUE: '#d97706', USER_PENDING: '#0891b2',
        };
        return colors[type] || '#6b7280';
    };

    return (
        <div ref={dropdownRef} className="notification-wrapper">
            <button
                className="notification-bell-btn"
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h4>Notifications {unreadCount > 0 && <span className="notification-count-label">({unreadCount})</span>}</h4>
                        {unreadCount > 0 && (
                            <button className="mark-all-read-btn" onClick={handleMarkAllAsRead}>
                                <CheckCheck size={14} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {loading && notifications.length === 0 ? (
                            <div className="notification-empty">
                                <div className="spinner-small"></div>
                                <p>Loading...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="notification-empty">
                                <Bell size={32} style={{ opacity: 0.3 }} />
                                <p>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.notification_id}
                                    className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                                    onClick={() => !n.is_read && handleMarkAsRead(n.notification_id)}
                                >
                                    <div className="notification-icon-col">
                                        <span className="notification-type-icon">{getTypeIcon(n.type)}</span>
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title-row">
                                            {!n.is_read && (
                                                <span className="notification-dot" style={{ backgroundColor: getTypeDot(n.type) }} />
                                            )}
                                            <strong className="notification-title">{n.title}</strong>
                                        </div>
                                        <p className="notification-message">{n.message}</p>
                                    </div>
                                    <span className="notification-time">{getTimeAgo(n.created_at)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
