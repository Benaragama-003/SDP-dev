import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Edit2 } from 'lucide-react';
import '../../styles/Dealers.css';

const LorryManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // ... (rest of code)

    const lorries = [
        { id: 'L001', number: 'CAA-1234', capacity: '5 tons', status: 'available', lastService: '2026-01-10' },
        { id: 'L002', number: 'CAB-5678', capacity: '5 tons', status: 'available', lastService: '2026-01-08' },
        { id: 'L003', number: 'CAC-9012', capacity: '10 tons', status: 'in-service', lastService: '2026-01-05' },
        { id: 'L004', number: 'CAD-3456', capacity: '10 tons', status: 'maintenance', lastService: '2025-12-20' },
    ];

    const filtered = lorries.filter(l =>
        l.number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [selectedLorry, setSelectedLorry] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    const handleEditClick = (lorry) => {
        setSelectedLorry(lorry);
        setNewStatus(lorry.status);
        setShowStatusModal(true);
    };

    const handleStatusUpdate = (e) => {
        e.preventDefault();
        // In a real app, update logic here
        alert(`Lorry ${selectedLorry.number} status updated to ${newStatus}`);
        setShowStatusModal(false);
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

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Lorries</h3>
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
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Lorry ID</th>
                                    <th>License Number</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((lorry) => (
                                    <tr key={lorry.id}>
                                        <td>{lorry.id}</td>
                                        <td>{lorry.number}</td>
                                        <td>
                                            <span className={`badge ${lorry.status === 'available' ? 'badge-success' :
                                                lorry.status === 'in-service' ? 'badge-warning' : 'badge-danger'
                                                }`}>
                                                {lorry.status.charAt(0).toUpperCase() + lorry.status.slice(1).replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions-cell">
                                                <button className="action-btn action-btn-edit" onClick={() => handleEditClick(lorry)}>
                                                    <Edit2 size={16} /> Edit Status
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                    <p><strong>Lorry Number:</strong> {selectedLorry.number}</p>
                                    <div className="form-field" style={{ marginTop: '15px' }}>
                                        <label>New Status</label>
                                        <select
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                            required
                                        >
                                            <option value="available">Available</option>
                                            <option value="in-service">In Service</option>
                                            <option value="maintenance">Maintenance</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Update Status</button>
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
