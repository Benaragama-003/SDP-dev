import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Calendar, MapPin, Eye, Package, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dispatchApi } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import '../../styles/Dispatch.css';

const DispatchView = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDispatch, setSelectedDispatch] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [dispatchDetails, setDispatchDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchDispatches();
    }, [statusFilter]);

    const fetchDispatches = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            
            const response = await dispatchApi.getAll(params);
            setDispatches(response.data.data.dispatches || []);
        } catch (error) {
            console.error('Failed to fetch dispatches:', error);
            alert('Failed to load dispatch history');
        } finally {
            setLoading(false);
        }
    };

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

    const handleViewProgress = async (dispatch) => {
        setSelectedDispatch(dispatch);
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
        d.dispatch_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.supervisor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.plate_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <AdminSidebar />
            <div className="dispatch-container">
                <main className="dispatch-main">
                    <div className="page-header" style={{ position: 'relative' }}>
                        <div>
                            <h1 className="page-title">Dispatch History</h1>
                            <p className="page-subtitle">View and monitor all dispatch operations</p>
                        </div>
                        <button
                            className="btn"
                            style={{
                                position: 'absolute',
                                top: '0',
                                right: '0',
                                backgroundColor: '#101540',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                borderRadius: '10px',
                                fontWeight: '600'
                            }}
                            onClick={() => navigate('/admin/dispatch')}
                        >
                            <ArrowLeft size={20} />
                            Back to Dispatch
                        </button>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Dispatches</h3>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #ddd' }}
                                >
                                    <option value="">All Status</option>
                                    <option value="SCHEDULED">Scheduled</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="AWAITING_UNLOAD">Awaiting Unload</option>
                                    <option value="UNLOADED">Unloaded</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                <div className="search-box">
                                    <Search className="search-icon" size={20} />
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder="Search by ID, Supervisor, or Lorry..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={fetchDispatches}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>
                        
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '50px' }}>Loading dispatches...</div>
                        ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Dispatch No</th>
                                    <th>Date</th>
                                    <th>Lorry</th>
                                    <th>Supervisor</th>
                                    <th>Route</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                            No dispatches found
                                        </td>
                                    </tr>
                                ) : (
                                filtered.map((dispatch) => (
                                    <tr key={dispatch.dispatch_id}>
                                        <td style={{ fontWeight: '600' }}>{dispatch.dispatch_number}</td>
                                        <td>{formatDate(dispatch.dispatch_date)}</td>
                                        <td>{dispatch.plate_number}</td>
                                        <td>{dispatch.supervisor_name}</td>
                                        <td>{dispatch.route}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(dispatch.status)}`}>
                                                {dispatch.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}
                                                    onClick={() => handleViewProgress(dispatch)}
                                                >
                                                    <Eye size={14} /> View Progress
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                        )}
                    </div>
                </main>

                {/* Harmonized Progress Modal */}
                {showProgressModal && selectedDispatch && (
                    <div className="modal-overlay" onClick={() => { setShowProgressModal(false); setDispatchDetails(null); }}>
                        <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '700px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>Dispatch Progress</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                                        {selectedDispatch.plate_number} • {selectedDispatch.route} • 
                                        <span className={`badge ${getStatusBadgeClass(selectedDispatch.status)}`} style={{ marginLeft: '10px' }}>
                                            {selectedDispatch.status.replace('_', ' ')}
                                        </span>
                                    </p>
                                </div>
                                <button className="modal-close" onClick={() => { setShowProgressModal(false); setDispatchDetails(null); }} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                {loadingDetails ? (
                                    <div style={{ textAlign: 'center', padding: '30px' }}>Loading details...</div>
                                ) : dispatchDetails ? (
                                    <>
                                        {/* Dispatch Info */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '12px' }}>
                                            <div><strong>Supervisor:</strong> {dispatchDetails.dispatch.supervisor_name}</div>
                                            <div><strong>Date:</strong> {formatDate(dispatchDetails.dispatch.dispatch_date)}</div>
                                            <div><strong>Lorry:</strong> {dispatchDetails.dispatch.plate_number}</div>
                                            <div><strong>Route:</strong> {dispatchDetails.dispatch.route}</div>
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
                                                {dispatchDetails.items.map((item, idx) => {
                                                    const soldQty = (item.sold_filled || 0) + (item.sold_new || 0);
                                                    const balance = item.loaded_quantity - soldQty - (item.damaged_quantity || 0);
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ fontWeight: '600' }}>{item.size} - {item.type}</td>
                                                            <td style={{ textAlign: 'center' }}>{item.loaded_quantity}</td>
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
                                                    {dispatchDetails.items.reduce((sum, i) => sum + (i.loaded_quantity || 0), 0)}
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#e8f5e9', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Sold</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#388e3c' }}>
                                                    {dispatchDetails.items.reduce((sum, i) => sum + (i.sold_filled || 0) + (i.sold_new || 0), 0)}
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#ffebee', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Damaged</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d32f2f' }}>
                                                    {dispatchDetails.items.reduce((sum, i) => sum + (i.damaged_quantity || 0), 0)}
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px', backgroundColor: '#f3e5f5', borderRadius: '12px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Balance</div>
                                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>
                                                    {dispatchDetails.items.reduce((sum, i) => sum + (i.loaded_quantity || 0) - (i.sold_filled || 0) - (i.sold_new || 0) - (i.damaged_quantity || 0), 0)}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No details available</div>
                                )}

                                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => { setShowProgressModal(false); setDispatchDetails(null); }}
                                        style={{ backgroundColor: '#101540', border: 'none', padding: '12px 60px', borderRadius: '25px', fontSize: '16px', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default DispatchView;
