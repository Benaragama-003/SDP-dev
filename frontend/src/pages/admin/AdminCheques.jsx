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
                        <div className="modal-content" style={{ borderRadius: '20px', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '20px 25px', borderBottom: '1px solid #eee' }}>
                                <h2 className="modal-title">Check Details</h2>
                                <button className="modal-close" onClick={() => setShowUpdateModal(false)}>×</button>
                            </div>
                            <div className="modal-body" style={{ padding: '25px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Cheque No</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.chequeNo}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Dealer</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.dealer}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Bank</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.bankName || 'BOC'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>Branch</p>
                                        <p style={{ fontWeight: '600', margin: 0 }}>{selectedCheque.branchName || 'Colombo'}</p>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <form onSubmit={handleUpdateStatus}>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Update Status</label>
                                            <select name="status" defaultValue={selectedCheque.status} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} required>
                                                <option value="pending">Pending</option>
                                                <option value="cleared">Cleared</option>
                                                <option value="Returned">Returned</option>
                                            </select>
                                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowUpdateModal(false)}>Cancel</button>
                                                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>Update Status</button>
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
