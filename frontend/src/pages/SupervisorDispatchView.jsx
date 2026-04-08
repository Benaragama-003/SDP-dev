import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Eye, Loader2, RefreshCw, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Dispatch.css';
import { formatDate } from '../utils/dateUtils';
import { dispatchApi } from '../services/api';

const SupervisorDispatchView = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispatch, setSelectedDispatch] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
    const [dispatchDetails, setDispatchDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch dispatches assigned to this supervisor
    const fetchDispatches = async () => {
        try {
            setLoading(true);
            const response = await dispatchApi.getAll({ supervisor_id: user?.user_id });
            setDispatches(response.data.data?.dispatches || []);
        } catch (error) {
            console.error('Failed to fetch dispatches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.user_id) {
            fetchDispatches();
        }
    }, [user?.user_id]);

    // Fetch dispatch details for the progress modal
    const fetchDispatchDetails = async (dispatchId) => {
        setLoadingDetails(true);
        try {
            const response = await dispatchApi.getById(dispatchId);
            setDispatchDetails(response.data.data);
        } catch (error) {
            console.error('Failed to fetch dispatch details:', error);
            alert('Failed to load dispatch details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleStartDispatch = async (dispatch) => {
        if (!window.confirm(`Start dispatch ${dispatch.dispatch_number}? Status will change to In Progress.`)) return;
        
        setActionLoading(true);
        try {
            await dispatchApi.start(dispatch.dispatch_id);
            alert("Trip started! Status updated to 'In Progress'.");
            fetchDispatches();
        } catch (error) {
            console.error('Failed to start dispatch:', error);
            alert(error.response?.data?.message || 'Failed to start dispatch');
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkComplete = async (dispatch) => {
        setSelectedDispatch(dispatch);
        setIsConfirmingCompletion(true);
        setShowProgressModal(true);
        await fetchDispatchDetails(dispatch.dispatch_id);
    };

    const confirmCompletion = async () => {
        setActionLoading(true);
        try {
            await dispatchApi.requestUnload(selectedDispatch.dispatch_id);
            alert('Dispatch marked as completed! Waiting for admin to accept unload.');
            setShowProgressModal(false);
            setIsConfirmingCompletion(false);
            setDispatchDetails(null);
            fetchDispatches();
        } catch (error) {
            console.error('Failed to request unload:', error);
            alert(error.response?.data?.message || 'Failed to complete trip');
        } finally {
            setActionLoading(false);
        }
    };

    const handleViewProgress = async (dispatch) => {
        setSelectedDispatch(dispatch);
        setIsConfirmingCompletion(false);
        setShowProgressModal(true);
        await fetchDispatchDetails(dispatch.dispatch_id);
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'SCHEDULED': return 'badge-secondary';
            case 'IN_PROGRESS': return 'badge-warning';
            case 'AWAITING_UNLOAD': return 'badge-info';
            case 'UNLOADED': return 'badge-success';
            case 'CANCELLED': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };

    const filtered = dispatches.filter(d =>
        (d.dispatch_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.plate_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeDispatch = dispatches.find(d => ['SCHEDULED', 'IN_PROGRESS', 'AWAITING_UNLOAD'].includes(d.status));

    return (
        <>
            <Sidebar />
            <div className="dispatch-container">
                <main className="dispatch-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Dispatch History</h1>
                            <p className="page-subtitle">Monitor my recent dispatch operations and progress</p>
                        </div>
                        <button
                            onClick={fetchDispatches}
                            disabled={loading}
                            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}
                        >
                            <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Refresh
                        </button>
                    </div>

                    {activeDispatch && (
                        <div style={{ backgroundColor: '#f4f7fa', borderRadius: '15px', padding: '25px', marginBottom: '30px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1a56db', fontWeight: 'bold', fontSize: '20px', marginBottom: '8px' }}>
                                    <Truck size={26} /> Active Dispatch
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '15px', marginBottom: '15px' }}>
                                    {activeDispatch.dispatch_number}
                                </div>
                                <div style={{ display: 'flex', gap: '40px', fontWeight: '500', color: '#374151', fontSize: '15px' }}>
                                    <span><strong>Lorry:</strong> {activeDispatch.plate_number}</span>
                                    <span><strong>Route:</strong> {activeDispatch.route}</span>
                                    <span><strong>Date:</strong> {formatDate(activeDispatch.dispatch_date)}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                <span className={`badge ${getStatusBadgeClass(activeDispatch.status)}`} style={{ fontSize: '14px', padding: '8px 16px' }}>
                                    {activeDispatch.status.replace(/_/g, ' ')}
                                </span>
                                
                                {activeDispatch.status === 'SCHEDULED' && (
                                    <button
                                        className="btn"
                                        style={{ backgroundColor: '#101540', color: 'white', padding: '12px 24px', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', border: 'none', cursor: 'pointer' }}
                                        onClick={() => handleStartDispatch(activeDispatch)}
                                        disabled={actionLoading}
                                    >
                                        Start Trip
                                    </button>
                                )}
                                {activeDispatch.status === 'IN_PROGRESS' && (
                                    <button
                                        className="btn"
                                        style={{ backgroundColor: '#dc3545', color: 'white', padding: '12px 24px', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', border: 'none', cursor: 'pointer' }}
                                        onClick={() => handleMarkComplete(activeDispatch)}
                                        disabled={actionLoading}
                                    >
                                        Complete Trip
                                    </button>
                                )}
                                {activeDispatch.status === 'AWAITING_UNLOAD' && (
                                    <button
                                        className="btn"
                                        style={{ backgroundColor: '#e5e7eb', color: '#4b5563', border: '1px solid #d1d5db', padding: '12px 24px', borderRadius: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', cursor: 'pointer' }}
                                        onClick={() => handleViewProgress(activeDispatch)}
                                    >
                                        <Eye size={18} /> View Progress
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Recent Dispatches</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Dispatch ID</th>
                                        <th>Date</th>
                                        <th>Lorry</th>
                                        <th>Route</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                                <Loader2 className="spinner" size={30} style={{ margin: '0 auto' }} />
                                                <p style={{ marginTop: '10px' }}>Loading dispatches...</p>
                                            </td>
                                        </tr>
                                    ) : filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                                No dispatches found
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((dispatch) => (
                                            <tr key={dispatch.dispatch_id}>
                                                <td style={{ fontWeight: '600' }}>{dispatch.dispatch_number}</td>
                                                <td>{formatDate(dispatch.dispatch_date)}</td>
                                                <td>{dispatch.plate_number}</td>
                                                <td>{dispatch.route}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(dispatch.status)}`}>
                                                        {dispatch.status.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}
                                                            onClick={() => handleViewProgress(dispatch)}
                                                        >
                                                            <Eye size={14} /> View Progress
                                                        </button>

                                                        {dispatch.status === 'SCHEDULED' && dispatch.dispatch_id !== activeDispatch?.dispatch_id && (
                                                            <button
                                                                className="btn btn-sm"
                                                                style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                                                                onClick={() => handleStartDispatch(dispatch)}
                                                                disabled={actionLoading}
                                                            >
                                                                {actionLoading ? 'Starting...' : 'Start Dispatch'}
                                                            </button>
                                                        )}

                                                        {dispatch.status === 'IN_PROGRESS' && dispatch.dispatch_id !== activeDispatch?.dispatch_id && (
                                                            <button
                                                                className="btn btn-sm"
                                                                style={{ backgroundColor: '#ff0000ff', color: '#101540', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                                                                onClick={() => handleMarkComplete(dispatch)}
                                                                disabled={actionLoading}
                                                            >
                                                                Complete Trip
                                                            </button>
                                                        )}

                                                        {dispatch.status === 'AWAITING_UNLOAD' && (
                                                            <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>Pending Admin Unload</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {/* Progress / Completion Confirmation Modal */}
                {showProgressModal && selectedDispatch && (
                    <div className="modal-overlay" onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); setDispatchDetails(null); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '0', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>
                                        {isConfirmingCompletion ? 'Confirm Completion' : 'Dispatch Progress'}
                                    </h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                                        {selectedDispatch.plate_number} • {selectedDispatch.route} •
                                        <span className={`badge ${getStatusBadgeClass(selectedDispatch.status)}`} style={{ marginLeft: '10px' }}>
                                            {selectedDispatch.status.replace(/_/g, ' ')}
                                        </span>
                                    </p>
                                </div>
                                <button className="modal-close" onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); setDispatchDetails(null); }} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                {isConfirmingCompletion && (
                                    <div style={{ backgroundColor: '#fff8e1', padding: '15px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #ffe082' }}>
                                        <div style={{ fontSize: '24px' }}>⚠️</div>
                                        <div>
                                            <p style={{ margin: '0', fontWeight: 'bold', color: '#856404' }}>Review before finalizing</p>
                                            <p style={{ margin: '0', fontSize: '13px', color: '#856404' }}>Once marked as completed, the dispatch will move to "Awaiting Unload" and you won't be able to edit it.</p>
                                        </div>
                                    </div>
                                )}

                                {loadingDetails ? (
                                    <div style={{ textAlign: 'center', padding: '30px' }}>
                                        <Loader2 className="spinner" size={30} style={{ margin: '0 auto' }} />
                                        <p style={{ marginTop: '10px' }}>Loading details...</p>
                                    </div>
                                ) : dispatchDetails ? (
                                    <>
                                        {/* Dispatch Info */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                                            <div><strong>Dispatch No:</strong> {dispatchDetails.dispatch?.dispatch_number || selectedDispatch.dispatch_number}</div>
                                            <div><strong>Date:</strong> {formatDate(dispatchDetails.dispatch?.dispatch_date || selectedDispatch.dispatch_date)}</div>
                                            <div><strong>Lorry:</strong> {dispatchDetails.dispatch?.plate_number || selectedDispatch.plate_number}</div>
                                            <div><strong>Route:</strong> {dispatchDetails.dispatch?.route || selectedDispatch.route}</div>
                                        </div>

                                        {/* Items Table */}
                                        <h4 style={{ marginBottom: '15px', color: '#333' }}>Dispatch Items</h4>
                                        <table className="data-table" style={{ marginBottom: '20px' }}>
                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th style={{ textAlign: 'center' }}>Loaded</th>
                                                    <th style={{ textAlign: 'center' }}>Sold</th>
                                                    <th style={{ textAlign: 'center' }}>Damaged</th>
                                                    <th style={{ textAlign: 'center' }}>Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(dispatchDetails.items || []).map((item, idx) => {
                                                    const soldQty = (item.sold_filled || 0) + (item.sold_new || 0);
                                                    const balance = (item.loaded_quantity || 0) - soldQty - (item.damaged_quantity || 0);
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: '600' }}>{item.size} - {item.type}</td>
                                                            <td style={{ textAlign: 'center' }}>{item.loaded_quantity || 0}</td>
                                                            <td style={{ textAlign: 'center', color: '#28a745' }}>{soldQty}</td>
                                                            <td style={{ textAlign: 'center', color: item.damaged_quantity > 0 ? '#dc3545' : '#666' }}>{item.damaged_quantity || 0}</td>
                                                            <td style={{ textAlign: 'center', fontWeight: '600', color: '#101540', backgroundColor: '#f0f4ff' }}>{balance}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Totals */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '20px' }}>
                                            <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Loaded</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                                                    {(dispatchDetails.items || []).reduce((sum, i) => sum + (i.loaded_quantity || 0), 0)}
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Sold</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                                                    {(dispatchDetails.items || []).reduce((sum, i) => sum + (i.sold_filled || 0) + (i.sold_new || 0), 0)}
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Damaged</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>
                                                    {(dispatchDetails.items || []).reduce((sum, i) => sum + (i.damaged_quantity || 0), 0)}
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Balance</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                                                    {(dispatchDetails.items || []).reduce((sum, i) => sum + (i.loaded_quantity || 0) - (i.sold_filled || 0) - (i.sold_new || 0) - (i.damaged_quantity || 0), 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No details available</div>
                                )}

                                <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                                    <button
                                        onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); setDispatchDetails(null); }}
                                        style={{ flex: 1, backgroundColor: '#dc3545', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '16px', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                                    >
                                        {isConfirmingCompletion ? 'Cancel' : 'Close'}
                                    </button>
                                    {isConfirmingCompletion && (
                                        <button
                                            onClick={confirmCompletion}
                                            disabled={actionLoading}
                                            style={{ flex: 1, backgroundColor: '#43e97b', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '16px', color: '#101540', cursor: 'pointer', fontWeight: '500' }}
                                        >
                                            {actionLoading ? 'Processing...' : 'Confirm & Finish'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SupervisorDispatchView;
