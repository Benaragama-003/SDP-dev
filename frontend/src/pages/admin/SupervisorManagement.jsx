import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, UserCheck, UserX, ShieldAlert } from 'lucide-react';
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
            status: (sup.status || 'INACTIVE').toLowerCase()
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/auth/supervisors/${selectedSup.user_id}/status`, {
                status: editData.status.toUpperCase()
            });
            fetchSupervisors();
            setShowEditModal(false);
            alert('Supervisor status updated successfully!');
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

                    <div className="table-container">
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
                                    <th>Supervisor ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Contact</th>
                                    <th>Monthly Target</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((sup) => (
                                    <tr key={sup.user_id}>
                                        <td>{sup.user_id}</td>
                                        <td>{sup.full_name}</td>
                                        <td title={sup.email}>
                                            <div className="email-cell">{sup.email}</div>
                                        </td>
                                        <td>{sup.phone_number}</td>
                                        <td style={{ fontWeight: '500', color: '#101540' }}>
                                            Rs. {(sup.monthly_target || 0).toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`badge ${sup.status.toLowerCase() === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {sup.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions-cell" style={{ display: 'flex', gap: '8px', minWidth: 'max-content', width: '100%' }}>
                                                <button
                                                    className="action-btn"
                                                    disabled={!isFullAdmin}
                                                    onClick={() => handleEditClick(sup)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        fontSize: '11px',
                                                        flex: 'none',
                                                        width: 'auto',
                                                        backgroundColor: isFullAdmin ? '#bfbf2a' : '#ccc',
                                                        color: 'white',
                                                        opacity: isFullAdmin ? 1 : 0.6,
                                                        cursor: isFullAdmin ? 'pointer' : 'not-allowed'
                                                    }}
                                                >
                                                    Edit / Activate
                                                </button>
                                                <button
                                                    className="action-btn"
                                                    disabled={!isFullAdmin}
                                                    onClick={() => handlePromote(sup)}
                                                    style={{
                                                        padding: '8px 16px',
                                                        fontSize: '11px',
                                                        flex: 'none',
                                                        width: 'auto',
                                                        backgroundColor: isFullAdmin ? '#101540' : '#ccc',
                                                        color: 'white',
                                                        opacity: isFullAdmin ? 1 : 0.6,
                                                        cursor: isFullAdmin ? 'pointer' : 'not-allowed'
                                                    }}
                                                >
                                                    Promote
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

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
