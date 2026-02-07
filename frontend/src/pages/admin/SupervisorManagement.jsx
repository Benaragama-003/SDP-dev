import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, UserCheck, UserX, ShieldAlert, Eye, Edit2, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Dealers.css';
import api from '../../services/api';

const SupervisorManagement = () => {
    const { user: currentAdmin } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(true);

    const isFullAdmin = currentAdmin?.access_level === 1;

    const fetchSupervisors = async () => {
        try {
            const response = await api.get('/auth/supervisors');
            setSupervisors(response.data.data);
        } catch (error) {
            console.error('Failed to fetch supervisors:', error);
            alert('Could not load supervisors');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSupervisors(); }, []);

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedSup, setSelectedSup] = useState(null);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        contact: '',
        target: '',
        status: ''
    });

    const filtered = (supervisors || []).filter((sup) =>
        (sup.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sup.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditClick = (sup) => {
        setSelectedSup(sup);
        setEditData({
            name: sup.full_name || '',
            email: sup.email || '',
            contact: sup.phone_number || '',
            target: sup.monthly_target || 0,
            status: (sup.account_status || 'INACTIVE').toLowerCase()
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/auth/supervisors/${selectedSup.user_id}/status`, {
                status: editData.status.toUpperCase(),
                monthly_target: parseFloat(editData.target) || 0
            });
            fetchSupervisors();
            setShowEditModal(false);
            alert('Supervisor updated successfully!');
        } catch (error) {
            console.error('Failed to update supervisor:', error);
            alert(error.response?.data?.message || 'Update failed');
        }
    };

    const handlePromote = async (sup) => {
        if (!window.confirm(`Are you sure you want to promote ${sup.full_name} to Admin (Level 2)?\nThis action will grant them administrative access.`)) {
            return;
        }

        try {
            await api.post(`/auth/supervisors/${sup.user_id}/promote`);
            alert('Supervisor promoted to Admin Level 2 successfully!');
            fetchSupervisors(); // Refresh list
        } catch (error) {
            console.error('Promotion failed:', error);
            alert(error.response?.data?.message || 'Promotion failed');
        }
    };

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Supervisor Management</h1>
                            <p className="page-subtitle">Manage supervisor accounts and permissions</p>
                        </div>
                    </div>

                    {!isFullAdmin && (
                        <div style={{ backgroundColor: '#fff4e5', color: '#663c00', padding: '12px 20px', borderRadius: '10px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', border: '1px solid #ffe2b7' }}>
                            <ShieldAlert size={20} />
                            <span><strong>Restricted Access:</strong> You do not have permission to active accounts or promote supervisors.</span>
                        </div>
                    )}

                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <div className="table-header">
                            <h3 className="table-title">All Supervisors</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search supervisors..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Target</th>
                                    <th>Account</th>
                                    <th>Work</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                    Loading supervisors...
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                    No supervisor accounts found
                                </td>
                            </tr>
                        ) : (
                            filtered.map((sup) => (
                                    <tr key={sup.user_id}>
                                        <td>{sup.full_name}</td>
                                        <td style={{ fontWeight: '500', color: '#101540' }}>
                                            Rs. {Number(sup.monthly_target || 0).toLocaleString('en-US')}
                                        </td>
                                        <td>
                                            <span className={`badge ${sup.account_status?.toLowerCase() === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {sup.account_status}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${
                                                sup.work_status === 'AVAILABLE' ? 'badge-success' : 
                                                sup.work_status === 'ON_DUTY' ? 'badge-warning' : 'badge-secondary'
                                            }`}>
                                                {sup.work_status?.replace('_', ' ') || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    className="action-btn"
                                                    onClick={() => { setSelectedSup(sup); setShowDetailsModal(true); }}
                                                    title="View Details"
                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#6b7280', color: 'white' }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    disabled={!isFullAdmin}
                                                    onClick={() => handleEditClick(sup)}
                                                    title="Edit"
                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: isFullAdmin ? '#bfbf2a' : '#ccc', color: 'white', opacity: isFullAdmin ? 1 : 0.5 }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    disabled={!isFullAdmin}
                                                    onClick={() => handlePromote(sup)}
                                                    title="Promote to Admin"
                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', backgroundColor: isFullAdmin ? '#101540' : '#ccc', color: 'white', opacity: isFullAdmin ? 1 : 0.5 }}
                                                >
                                                    <UserPlus size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* View Details Modal */}
                {showDetailsModal && selectedSup && (
                    <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '100%' }}>
                            <div className="modal-header" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                                <h2 style={{ fontSize: '20px', margin: 0 }}>Supervisor Details</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px' }}>Full Name</span>
                                    <span style={{ fontWeight: '600', textAlign: 'right' }}>{selectedSup.full_name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px', flexShrink: 0 }}>Email</span>
                                    <span style={{ fontWeight: '600', textAlign: 'right', wordBreak: 'break-all' }}>{selectedSup.email}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px' }}>Contact</span>
                                    <span style={{ fontWeight: '600', textAlign: 'right' }}>{selectedSup.phone_number}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px' }}>Monthly Target</span>
                                    <span style={{ fontWeight: '600', textAlign: 'right' }}>Rs. {Number(selectedSup.monthly_target || 0).toLocaleString('en-US')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px' }}>Achieved Sales</span>
                                    <span style={{ fontWeight: '600', textAlign: 'right' }}>Rs. {Number(selectedSup.achieved_sales || 0).toLocaleString('en-US')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px' }}>Account Status</span>
                                    <span className={`badge ${selectedSup.account_status?.toLowerCase() === 'active' ? 'badge-success' : 'badge-danger'}`}>{selectedSup.account_status}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <span style={{ color: '#6b7280', minWidth: '120px' }}>Work Status</span>
                                    <span className={`badge ${selectedSup.work_status === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>{selectedSup.work_status?.replace('_', ' ')}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDetailsModal(false)} 
                                style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#ff0000', color: 'white', cursor: 'pointer' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {showEditModal && selectedSup && (
                    <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px', borderRadius: '20px', maxWidth: '450px' }}>
                            <div className="modal-header" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                                <h2 style={{ fontSize: '20px', margin: 0 }}>Edit Target & Status</h2>
                            </div>
                            <form onSubmit={handleEditSubmit}>
                                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                    <div className="form-field">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            value={editData.name}
                                            readOnly
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', color: '#666' }}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Account Status*</label>
                                        <select
                                            value={editData.status}
                                            onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: '#fff' }}
                                            required
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="form-field">
                                        <label>Monthly Target (Rs)*</label>
                                        <input
                                            type="number"
                                            value={editData.target}
                                            onChange={(e) => setEditData({ ...editData, target: e.target.value })}
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ padding: '12px', backgroundColor: '#fff8e1', borderRadius: '10px', fontSize: '11px', color: '#856404', border: '1px solid #ffeeba', lineHeight: '1.4' }}>
                                        <strong>Note:</strong> Personal details (Email, Contact) are secured.
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                                    <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div >
        </>
    );
};

export default SupervisorManagement;
