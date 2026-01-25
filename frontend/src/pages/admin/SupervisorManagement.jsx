import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, UserCheck, UserX } from 'lucide-react';
import '../../styles/Dealers.css';

const SupervisorManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const [supervisors, setSupervisors] = useState([
        { id: 'S001', name: 'John Supervisor', email: 'john@hidellana.lk', contact: '0771234567', route: 'Route A', status: 'active', target: 2500000 },
        { id: 'S002', name: 'Jane Smith', email: 'jane@hidellana.lk', contact: '0777654321', route: 'Route B', status: 'active', target: 2000000 },
        { id: 'S003', name: 'Mike Johnson', email: 'mike@hidellana.lk', contact: '0769876543', route: 'Route C', status: 'active', target: 1800000 },
        { id: 'S004', name: 'Sarah Williams', email: 'sarah@hidellana.lk', contact: '0775432167', route: 'Route A', status: 'inactive', target: 1500000 },
    ]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedSup, setSelectedSup] = useState(null);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        contact: '',
        target: '',
        status: ''
    });

    const filtered = supervisors.filter((sup) =>
        sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sup.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditClick = (sup) => {
        setSelectedSup(sup);
        setEditData({
            name: sup.name,
            email: sup.email,
            contact: sup.contact,
            target: sup.target,
            status: sup.status
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        setSupervisors(supervisors.map(s =>
            s.id === selectedSup.id ? { ...s, ...editData, target: Number(editData.target) } : s
        ));
        setShowEditModal(false);
        alert('Supervisor updated successfully!');
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
                                    <tr key={sup.id}>
                                        <td>{sup.id}</td>
                                        <td>{sup.name}</td>
                                        <td>{sup.email}</td>
                                        <td>{sup.contact}</td>
                                        <td style={{ fontWeight: '600', color: '#101540' }}>Rs. {(sup.target || 1500000).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${sup.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {sup.status.charAt(0).toUpperCase() + sup.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions-cell">
                                                <button
                                                    className="action-btn action-btn-edit"
                                                    onClick={() => handleEditClick(sup)}
                                                    style={{ padding: '8px 16px', fontSize: '12px', backgroundColor: '#bfbf2a', color: 'white' }}
                                                >
                                                    Edit
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
                                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Cancel</button>
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
