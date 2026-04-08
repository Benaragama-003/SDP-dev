import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Edit2, Loader2, AlertCircle, Download } from 'lucide-react';
import { chequeApi } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import '../../styles/Dealers.css';

const AdminCheques = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [cheques, setCheques] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCheque, setSelectedCheque] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [returnReason, setReturnReason] = useState('');

    useEffect(() => {
        fetchCheques();
    }, []);

    const fetchCheques = async () => {
        try {
            setLoading(true);
            const response = await chequeApi.getAll();
            setCheques(response.data.data || []);
        } catch (err) {
            console.error('Error fetching cheques:', err);
            setError(err.response?.data?.message || 'Failed to load cheques');
        } finally {
            setLoading(false);
        }
    };

    const filtered = cheques.filter(c => {
        const matchesSearch = 
            c.dealer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.cheque_number?.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || 
            c.clearance_status?.toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const openUpdateModal = (cheque) => {
        setSelectedCheque(cheque);
        setReturnReason('');
        setShowUpdateModal(true);
    };

    const handleExport = async () => {
        try {
            setUpdating(true);
            const response = await chequeApi.exportToExcel();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `cheques_report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            const errorMessage = error.response?.data?.message || 'Failed to export cheques list';
            alert(errorMessage);
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        const newStatus = e.target.status.value;
        
        setUpdating(true);
        try {
            await chequeApi.updateStatus(selectedCheque.cheque_payment_id, { 
                status: newStatus,
                return_reason: returnReason
            });
            await fetchCheques();
            setShowUpdateModal(false);
            alert('Cheque status updated!');
        } catch (err) {
            console.error('Error updating cheque:', err);
            alert(err.response?.data?.message || 'Failed to update cheque');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status?.toUpperCase()) {
            case 'CLEARED': return { class: 'badge-success', label: 'Cleared' };
            case 'RETURNED': return { class: 'badge-danger', label: 'Bounced' };
            case 'CANCELLED': return { class: 'badge-secondary', label: 'Cancelled' };
            default: return { class: 'badge-warning', label: 'Pending' };
        }
    };

    if (loading) {
        return (
            <>
                <AdminSidebar />
                <div className="dealers-container">
                    <main className="dealers-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
                    </main>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <AdminSidebar />
                <div className="dealers-container">
                    <main className="dealers-main">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <AlertCircle size={60} color="#dc3545" style={{ marginBottom: '20px' }} />
                            <h2 style={{ color: '#101540', marginBottom: '10px' }}>Error Loading Cheques</h2>
                            <p style={{ color: '#666' }}>{error}</p>
                        </div>
                    </main>
                </div>
            </>
        );
    }

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div>
                                <h1 className="page-title">Cheques Management</h1>
                                <p className="page-subtitle">Track and manage customer cheques</p>
                            </div>
                            <button className="btn btn-primary" onClick={handleExport} disabled={updating}>
                                <Download size={20} />
                                {updating ? 'Exporting...' : 'Export Report'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Cheques</h3>
                            <div className="table-actions">
                                <select
                                    className="filter-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="cleared">Cleared</option>
                                    <option value="returned">Bounced</option>
                                </select>
                                <div className="search-box">
                                    <Search className="search-icon" size={20} />
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder="Search cheques..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Dealer</th>
                                    <th>Cheque Number</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                            No cheques found
                                        </td>
                                    </tr>
                                ) : filtered.map((cheque) => {
                                    const status = getStatusBadge(cheque.clearance_status);
                                    return (
                                    <tr key={cheque.cheque_payment_id}>
                                        <td>{cheque.dealer_name}</td>
                                        <td>{cheque.cheque_number}</td>
                                        <td>Rs. {parseFloat(cheque.amount || 0).toLocaleString()}</td>
                                        <td>{formatDate(cheque.cheque_date)}</td>
                                        <td>
                                            <span className={`badge ${status.class}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions-cell">
                                                <button className="action-btn action-btn-edit" onClick={() => openUpdateModal(cheque)}>
                                                    <Edit2 size={16} /> Update Status
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>

                {showUpdateModal && selectedCheque && (
                    <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
                        <div className="modal-content" style={{ borderRadius: '20px', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '20px 25px', borderBottom: '1px solid #eee' }}>
                                <h2 className="modal-title">Cheque Details</h2>
                                <button className="modal-close" onClick={() => setShowUpdateModal(false)}>×</button>
                            </div>
                            <div className="modal-body" style={{ padding: '25px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Cheque No</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.cheque_number}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Dealer</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.dealer_name}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Bank</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.bank_name}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Branch</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.branch_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Amount</p>
                                        <p style={{ fontWeight: '600', margin: 0, color: '#101540' }}>Rs. {parseFloat(selectedCheque.amount || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Cheque Date</p>
                                        <p style={{ fontWeight: '600', margin: 0, color: new Date(selectedCheque.cheque_date) > new Date() ? '#dc3545' : '#28a745' }}>
                                            {formatDate(selectedCheque.cheque_date)}
                                            {new Date(selectedCheque.cheque_date) > new Date() && 
                                                <span style={{ fontSize: '11px', display: 'block', color: '#dc3545' }}>Not yet matured</span>
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Current Status</p>
                                        <span className={`badge ${getStatusBadge(selectedCheque.clearance_status).class}`}>
                                            {getStatusBadge(selectedCheque.clearance_status).label}
                                        </span>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <form onSubmit={handleUpdateStatus}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Update Status</label>
                                            <select name="status" defaultValue={selectedCheque.clearance_status} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px' }} required>
                                                <option value="PENDING">Pending</option>
                                                <option value="CLEARED">Cleared</option>
                                                <option value="RETURNED">Returned (Bounced)</option>
                                                <option value="CANCELLED">Cancelled</option>
                                            </select>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Return Reason (if bounced)</label>
                                                <input
                                                    type="text"
                                                    value={returnReason}
                                                    onChange={(e) => setReturnReason(e.target.value)}
                                                    placeholder="e.g., Insufficient funds"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                />
                                            </div>
                                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowUpdateModal(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }} disabled={updating}>
                                                    {updating ? 'Updating...' : 'Update Status'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminCheques;
