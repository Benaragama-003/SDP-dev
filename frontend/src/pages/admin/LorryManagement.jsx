import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Edit2, Wrench, Loader2, Trash2 } from 'lucide-react';
import api from '../../services/api';
import '../../styles/Dealers.css';

const LorryManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [lorries, setLorries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // Fetch lorries from API
    const fetchLorries = async () => {
        try {
            setLoading(true);
            const response = await api.get('/lorries');
            setLorries(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch lorries:', err);
            setError('Failed to load lorries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLorries();
    }, []);

    const filtered = lorries.filter(l =>
        l.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.vehicle_model?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [selectedLorry, setSelectedLorry] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [updating, setUpdating] = useState(false);

    const handleEditClick = (lorry) => {
        setSelectedLorry(lorry);
        setNewStatus(lorry.status);
        setShowStatusModal(true);
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await api.put(`/lorries/${selectedLorry.lorry_id}`, { status: newStatus });
            alert(`Lorry ${selectedLorry.vehicle_number} status updated!`);
            setShowStatusModal(false);
            fetchLorries(); // Refresh list
        } catch (err) {
            alert('Failed to update status: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdating(false);
        }
    };

    // Mark service as done - updates last_service_date to today, next_service_date to +3 months
    const handleMarkServiceDone = async (lorry) => {
        if (!confirm(`Mark service done for ${lorry.vehicle_number}? This will update the next service date to 3 months from today.`)) {
            return;
        }
        try {
            await api.patch(`/lorries/${lorry.lorry_id}/service-done`);
            alert('Service marked as done! Next service date updated.');
            fetchLorries(); // Refresh list
        } catch (err) {
            alert('Failed to update: ' + (err.response?.data?.message || err.message));
        }
    };

    // Delete lorry
    const handleDelete = async (lorry) => {
        if (lorry.status === 'ON_ROUTE') {
            alert('Cannot delete lorry that is currently on route. Complete the dispatch first.');
            return;
        }
        if (!confirm(`Are you sure you want to delete lorry ${lorry.vehicle_number}? This action cannot be undone.`)) {
            return;
        }
        try {
            await api.delete(`/lorries/${lorry.lorry_id}`);
            alert('Lorry deleted successfully!');
            fetchLorries(); // Refresh list
        } catch (err) {
            alert('Failed to delete: ' + (err.response?.data?.message || err.message));
        }
    };

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    // Check if service is due (next_service_date is in the past or within 7 days)
    const isServiceDue = (nextServiceDate) => {
        if (!nextServiceDate) return false;
        const next = new Date(nextServiceDate);
        const today = new Date();
        const diffDays = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    };

    // Get status badge class
    const getStatusBadge = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'badge-success';
            case 'ON_ROUTE': return 'badge-warning';
            case 'MAINTENANCE': return 'badge-danger';
            default: return 'badge-secondary';
        }
    };

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Lorry Management</h1>
                            <p className="page-subtitle">Manage delivery vehicles</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate('/admin/lorries/add')}>
                            <Plus size={20} />
                            Add New Lorry
                        </button>
                    </div>

                    {error && (
                        <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px', marginBottom: '20px' }}>
                            {error}
                        </div>
                    )}

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Lorries ({lorries.length})</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search lorries..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Loader2 size={40} className="spinning" />
                                <p>Loading lorries...</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Lorry ID</th>
                                        <th>Vehicle Number</th>
                                        <th>Model</th>
                                        <th>Status</th>
                                        <th>Last Service</th>
                                        <th>Next Service</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                                No lorries found
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((lorry) => (
                                            <tr key={lorry.lorry_id}>
                                                <td>{lorry.lorry_id}</td>
                                                <td><strong>{lorry.vehicle_number}</strong></td>
                                                <td>{lorry.vehicle_model || '-'}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadge(lorry.status)}`}>
                                                        {lorry.status?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>{formatDate(lorry.last_service_date)}</td>
                                                <td>
                                                    <span style={{ 
                                                        color: isServiceDue(lorry.next_service_date) ? '#dc2626' : 'inherit',
                                                        fontWeight: isServiceDue(lorry.next_service_date) ? 'bold' : 'normal'
                                                    }}>
                                                        {formatDate(lorry.next_service_date)}
                                                        {isServiceDue(lorry.next_service_date) && ' ⚠️'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="table-actions-cell" style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            className="action-btn action-btn-edit" 
                                                            onClick={() => handleEditClick(lorry)}
                                                            title="Edit Status"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            className="action-btn" 
                                                            style={{ backgroundColor: '#16a34a', color: 'white' }}
                                                            onClick={() => handleMarkServiceDone(lorry)}
                                                            title="Mark Service Done"
                                                        >
                                                            <Wrench size={16} />
                                                        </button>
                                                        <button 
                                                            className="action-btn action-btn-delete" 
                                                            onClick={() => handleDelete(lorry)}
                                                            title="Delete Lorry"
                                                            disabled={lorry.status === 'ON_ROUTE'}
                                                            style={lorry.status === 'ON_ROUTE' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                                        >
                                                            <Trash2 size={16} />
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

                {/* Status Update Modal */}
                {showStatusModal && selectedLorry && (
                    <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Update Lorry Status</h2>
                                <button className="modal-close" onClick={() => setShowStatusModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleStatusUpdate}>
                                <div className="modal-body">
                                    <p><strong>Vehicle Number:</strong> {selectedLorry.vehicle_number}</p>
                                    <p><strong>Model:</strong> {selectedLorry.vehicle_model || '-'}</p>
                                    <div className="form-field" style={{ marginTop: '15px' }}>
                                        <label>New Status</label>
                                        {selectedLorry.status === 'ON_ROUTE' ? (
                                            <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                                Cannot change status while lorry is on route. Complete the dispatch first.
                                            </p>
                                        ) : (
                                            <select
                                                value={newStatus}
                                                onChange={(e) => setNewStatus(e.target.value)}
                                                required
                                            >
                                                <option value="AVAILABLE">Available</option>
                                                <option value="MAINTENANCE">Maintenance</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)} disabled={updating}>
                                        Cancel
                                    </button>
                                    {selectedLorry.status !== 'ON_ROUTE' && (
                                        <button type="submit" className="btn btn-primary" disabled={updating}>
                                            {updating ? 'Updating...' : 'Update Status'}
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default LorryManagement;
