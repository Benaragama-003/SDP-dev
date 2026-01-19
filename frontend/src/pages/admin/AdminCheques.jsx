import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Edit2, DollarSign } from 'lucide-react';
import '../../styles/Dealers.css';

const AdminCheques = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [cheques, setCheques] = useState([
        { id: 'CHQ-001', dealer: 'ABC Stores', amount: 45000, chequeNo: '123456', date: '2026-01-20', status: 'pending' },
        { id: 'CHQ-002', dealer: 'XYZ Mart', amount: 78000, chequeNo: '789012', date: '2026-01-18', status: 'cleared' },
        { id: 'CHQ-003', dealer: 'LMN Distributors', amount: 32000, chequeNo: '345678', date: '2026-01-25', status: 'pending' },
        { id: 'CHQ-004', dealer: 'PQR Suppliers', amount: 91000, chequeNo: '901234', date: '2026-01-15', status: 'bounced' },
    ]);
    const [selectedCheque, setSelectedCheque] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const filtered = cheques.filter(c => {
        const matchesSearch = c.dealer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.chequeNo.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const openUpdateModal = (cheque) => {
        setSelectedCheque(cheque);
        setShowUpdateModal(true);
    };

    const handleUpdateStatus = (e) => {
        e.preventDefault();
        const newStatus = e.target.status.value;
        setCheques(cheques.map(c => c.id === selectedCheque.id ? { ...c, status: newStatus } : c));
        setShowUpdateModal(false);
        alert('Cheque status updated!');
    };

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Cheques Management</h1>
                            <p className="page-subtitle">Track and manage customer cheques</p>
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
                                    <option value="bounced">Bounced</option>
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
                                    <th>Cheque ID</th>
                                    <th>Dealer</th>
                                    <th>Cheque Number</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((cheque) => (
                                    <tr key={cheque.id}>
                                        <td>{cheque.id}</td>
                                        <td>{cheque.dealer}</td>
                                        <td>{cheque.chequeNo}</td>
                                        <td>Rs. {cheque.amount.toLocaleString()}</td>
                                        <td>{cheque.date}</td>
                                        <td>
                                            <span className={`badge ${cheque.status === 'cleared' ? 'badge-success' :
                                                cheque.status === 'bounced' ? 'badge-danger' : 'badge-warning'
                                                }`}>
                                                {cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                {showUpdateModal && selectedCheque && (
                    <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Update Cheque Status</h2>
                                <button className="modal-close" onClick={() => setShowUpdateModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleUpdateStatus}>
                                <div className="modal-body">
                                    <p><strong>Cheque No:</strong> {selectedCheque.chequeNo}</p>
                                    <p><strong>Dealer:</strong> {selectedCheque.dealer}</p>
                                    <div className="form-field" style={{ marginTop: '15px' }}>
                                        <label>New Status</label>
                                        <select name="status" defaultValue={selectedCheque.status} required>
                                            <option value="pending">Pending</option>
                                            <option value="cleared">Cleared</option>
                                            <option value="bounced">Bounced</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowUpdateModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Update</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminCheques;
