import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Eye, RefreshCw, Truck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { dispatchApi } from '../services/api';
import '../styles/Dispatch.css';

const SupervisorDispatchView = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [dispatches, setDispatches] = useState([]);
    const [activeDispatch, setActiveDispatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDispatch, setSelectedDispatch] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);
    const [dispatchDetails, setDispatchDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [editedItems, setEditedItems] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch supervisor's dispatches and active dispatch
            const [dispatchesRes, activeRes] = await Promise.all([
                dispatchApi.getAll({ supervisor_id: user?.user_id }),
                dispatchApi.getMyDispatch().catch(() => ({ data: { data: null } }))
            ]);
            
            setDispatches(dispatchesRes.data.data.dispatches || []);
            setActiveDispatch(activeRes.data.data);
        } catch (error) {
            console.error('Failed to fetch dispatches:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDispatchDetails = async (dispatchId) => {
        setLoadingDetails(true);
        try {
            const response = await dispatchApi.getById(dispatchId);
            const details = response.data.data;
            setDispatchDetails(details);
            // Initialize editable items
            setEditedItems(details.items.map(item => ({
                product_id: item.product_id,
                sold_filled: item.sold_filled || 0,
                sold_new: item.sold_new || 0,
                empty_collected: item.empty_collected || 0,
                damaged_quantity: item.damaged_quantity || 0,
                loaded_quantity: item.loaded_quantity,
                size: item.size,
                type: item.type
            })));
        } catch (error) {
            console.error('Failed to fetch dispatch details:', error);
            alert('Failed to load dispatch details');
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleStartDispatch = async (dispatchId) => {
        if (!window.confirm('Are you sure you want to start this dispatch?')) return;
        
        try {
            await dispatchApi.start(dispatchId);
            alert("Trip started! Status updated to 'In Progress'.");
            fetchData();
        } catch (error) {
            console.error('Failed to start dispatch:', error);
            alert(error.response?.data?.message || 'Failed to start dispatch');
        }
    };

    const handleViewProgress = async (dispatch) => {
        setSelectedDispatch(dispatch);
        setIsConfirmingCompletion(false);
        setShowProgressModal(true);
        await fetchDispatchDetails(dispatch.dispatch_id);
    };

    const handleMarkComplete = async (dispatch) => {
        setSelectedDispatch(dispatch);
        setIsConfirmingCompletion(true);
        setShowProgressModal(true);
        await fetchDispatchDetails(dispatch.dispatch_id);
    };

    const confirmCompletion = async () => {
        if (!window.confirm('Are you sure you want to complete this trip? The remaining balance will be returned to warehouse.')) return;
        
        setUpdating(true);
        try {
            // Request unload - sold/damaged quantities are already tracked via invoices/damage reports
            await dispatchApi.requestUnload(selectedDispatch.dispatch_id);
            
            alert('Dispatch completed! Waiting for admin to accept unload.');
            setShowProgressModal(false);
            setIsConfirmingCompletion(false);
            fetchData();
        } catch (error) {
            console.error('Failed to complete dispatch:', error);
            alert(error.response?.data?.message || 'Failed to complete dispatch');
        } finally {
            setUpdating(false);
        }
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
        d.dispatch_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Sidebar />
            <div className="dispatch-container">
                <main className="dispatch-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Dispatches</h1>
                            <p className="page-subtitle">Monitor and manage your dispatch operations</p>
                        </div>
                        <button
                            onClick={fetchData}
                            style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <RefreshCw size={16} /> Refresh
                        </button>
                    </div>

                    {/* Active Dispatch Card */}
                    {activeDispatch && (
                        <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '15px', marginBottom: '25px', border: '2px solid #1976d2' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#1976d2', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Truck size={24} /> Active Dispatch
                                    </h3>
                                    <p style={{ margin: '5px 0 0', color: '#666' }}>{activeDispatch.dispatch_id}</p>
                                </div>
                                <span className={`badge ${getStatusBadgeClass(activeDispatch.status)}`} style={{ fontSize: '14px', padding: '8px 15px' }}>
                                    {activeDispatch.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                                <div><strong>Lorry:</strong> {activeDispatch.plate_number}</div>
                                <div><strong>Route:</strong> {activeDispatch.route}</div>
                                <div><strong>Date:</strong> {formatDate(activeDispatch.dispatch_date)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {activeDispatch.status === 'SCHEDULED' && (
                                    <button
                                        onClick={() => handleStartDispatch(activeDispatch.dispatch_id)}
                                        style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Start Dispatch
                                    </button>
                                )}
                                {activeDispatch.status === 'IN_PROGRESS' && (
                                    <>
                                        <button
                                            onClick={() => handleViewProgress(activeDispatch)}
                                            style={{ backgroundColor: '#101540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            View Progress
                                        </button>
                                        <button
                                            onClick={() => handleMarkComplete(activeDispatch)}
                                            style={{ backgroundColor: '#ffc107', color: '#101540', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            Complete Trip
                                        </button>
                                    </>
                                )}
                                {activeDispatch.status === 'AWAITING_UNLOAD' && (
                                    <span style={{ color: '#666', fontStyle: 'italic' }}>Waiting for admin to accept unload...</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Dispatch History</h3>
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
                        
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '50px' }}>Loading dispatches...</div>
                        ) : (
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
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                                No dispatches found
                                            </td>
                                        </tr>
                                    ) : (
                                    filtered.map((dispatch) => (
                                        <tr key={dispatch.dispatch_id}>
                                            <td style={{ fontWeight: '600' }}>{dispatch.dispatch_id}</td>
                                            <td>{formatDate(dispatch.dispatch_date)}</td>
                                            <td>{dispatch.plate_number}</td>
                                            <td>{dispatch.route}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(dispatch.status)}`}>
                                                    {dispatch.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}
                                                        onClick={() => handleViewProgress(dispatch)}
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                </main>

                {showProgressModal && selectedDispatch && (
                    <div className="modal-overlay" onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); setDispatchDetails(null); }}>
                        <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '700px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>
                                        {isConfirmingCompletion ? 'Complete Trip' : 'Dispatch Progress'}
                                    </h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                                        {selectedDispatch.plate_number} • {selectedDispatch.route}
                                    </p>
                                </div>
                                <button className="modal-close" onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); setDispatchDetails(null); }} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                {loadingDetails ? (
                                    <div style={{ textAlign: 'center', padding: '30px' }}>Loading...</div>
                                ) : dispatchDetails ? (
                                    <>
                                {isConfirmingCompletion && (
                                    <div style={{ backgroundColor: '#fff8e1', padding: '15px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #ffe082' }}>
                                        <div style={{ fontSize: '24px' }}>⚠️</div>
                                        <div>
                                            <p style={{ margin: '0', fontWeight: 'bold', color: '#856404' }}>Review before finalizing</p>
                                            <p style={{ margin: '0', fontSize: '13px', color: '#856404' }}>Verify the sold and damaged quantities before completing the trip.</p>
                                        </div>
                                    </div>
                                )}

                                {/* Read-only Items Table - quantities updated via invoices/damage reports */}
                                <table className="data-table" style={{ marginBottom: '20px' }}>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th style={{ textAlign: 'center' }}>Loaded</th>
                                            <th style={{ textAlign: 'center' }}>Refill</th>
                                            <th style={{ textAlign: 'center' }}>New</th>
                                            <th style={{ textAlign: 'center' }}>Empty</th>
                                            <th style={{ textAlign: 'center' }}>Damaged</th>
                                            <th style={{ textAlign: 'center' }}>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {editedItems.map((item, idx) => {
                                            const totalSold = (item.sold_filled || 0) + (item.sold_new || 0);
                                            const balance = item.loaded_quantity - totalSold - item.damaged_quantity;
                                            return (
                                                <tr key={idx}>
                                                    <td style={{ fontWeight: '600' }}>{item.size} - {item.type}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.loaded_quantity}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ color: '#28a745', fontWeight: '600' }}>{item.sold_filled || 0}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ color: '#1976d2', fontWeight: '600' }}>{item.sold_new || 0}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ color: '#ff9800', fontWeight: '600' }}>{item.empty_collected || 0}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ color: item.damaged_quantity > 0 ? '#dc3545' : '#666', fontWeight: '600' }}>{item.damaged_quantity}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: '600', color: '#101540', backgroundColor: '#f0f4ff' }}>{balance}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Totals Summary */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginTop: '15px' }}>
                                    <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#666' }}>Loaded</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                                            {editedItems.reduce((sum, i) => sum + i.loaded_quantity, 0)}
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#666' }}>Refill</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#388e3c' }}>
                                            {editedItems.reduce((sum, i) => sum + parseInt(i.sold_filled || 0), 0)}
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#666' }}>New</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>
                                            {editedItems.reduce((sum, i) => sum + parseInt(i.sold_new || 0), 0)}
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px', backgroundColor: '#fff3e0', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#666' }}>Empty</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>
                                            {editedItems.reduce((sum, i) => sum + parseInt(i.empty_collected || 0), 0)}
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px', backgroundColor: '#ffebee', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#666' }}>Damaged</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#d32f2f' }}>
                                            {editedItems.reduce((sum, i) => sum + parseInt(i.damaged_quantity || 0), 0)}
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px', backgroundColor: '#f3e5f5', borderRadius: '10px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '10px', color: '#666' }}>Balance</div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#7b1fa2' }}>
                                            {editedItems.reduce((sum, i) => sum + (i.loaded_quantity - parseInt(i.sold_filled || 0) - parseInt(i.sold_new || 0) - parseInt(i.damaged_quantity || 0)), 0)}
                                        </div>
                                    </div>
                                </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No details available</div>
                                )}

                                <div style={{ marginTop: '25px', display: 'flex', gap: '15px' }}>
                                    <button
                                        onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); setDispatchDetails(null); }}
                                        style={{ flex: 1, backgroundColor: '#6c757d', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '16px', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                                    >
                                        Close
                                    </button>
                                    {isConfirmingCompletion && (
                                        <button
                                            onClick={confirmCompletion}
                                            disabled={updating}
                                            style={{ flex: 1, backgroundColor: '#ffc107', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '16px', color: '#101540', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {updating ? 'Processing...' : 'Confirm & Finish Trip'}
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
