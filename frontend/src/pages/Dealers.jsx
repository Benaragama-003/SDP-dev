import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Plus, Edit2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dealerApi } from '../services/api';
import '../styles/Dealers.css';

const Dealers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDealer, setSelectedDealer] = useState(null);

    // Fetch dealers from backend
    useEffect(() => {
        fetchDealers();
    }, []);

    const fetchDealers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await dealerApi.getAllDealers(searchTerm);
            setDealers(response.data.data || []);
        } catch (err) {
            console.error('Error fetching dealers:', err);
            setError(err.response?.data?.message || 'Failed to fetch dealers');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchTerm !== undefined) {
                fetchDealers();
            }
        }, 500);

        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const getStatusBadgeClass = (status) => {
        switch (status?.toUpperCase()) {
            case 'ACTIVE':
                return 'badge-success';
            case 'INACTIVE':
                return 'badge-danger';
            case 'BLACKLISTED':
                return 'badge-warning';
            default:
                return 'badge-secondary';
        }
    };

    const handleViewDetails = (dealer) => {
        setSelectedDealer(dealer);
        setShowDetailsModal(true);
    };

    return (
        <>
            <Sidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Dealers Management</h1>
                            <p className="page-subtitle">Manage your dealer network</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate('/dealers/add')}>
                            <Plus size={20} />
                            Add New Dealer
                        </button>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Dealers</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search dealers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                                <p>Loading dealers...</p>
                            </div>
                        ) : error ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>
                                <p>Error: {error}</p>
                                <button className="btn btn-primary" onClick={fetchDealers} style={{ marginTop: '10px' }}>
                                    Retry
                                </button>
                            </div>
                        ) : dealers.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                                <p>No dealers found</p>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Dealer ID</th>
                                        <th>Name</th>
                                        <th>Contact</th>
                                        <th>Route</th>
                                        <th>Credit Limit</th>
                                        <th>Current Credit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dealers.map((dealer) => (
                                        <tr key={dealer.dealer_id}>
                                            <td>{dealer.dealer_id}</td>
                                            <td>{dealer.dealer_name}</td>
                                            <td>{dealer.contact_number}</td>
                                            <td>{dealer.route || 'N/A'}</td>
                                            <td>Rs. {Number(dealer.credit_limit || 0).toLocaleString()}</td>
                                            <td>Rs. {Number(dealer.current_credit || 0).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge ${getStatusBadgeClass(dealer.status)}`}>
                                                    {dealer.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="table-actions-cell">
                                                    <button
                                                        className="action-btn action-btn-edit"
                                                        onClick={() => navigate(`/dealers/update/${dealer.dealer_id}`)}
                                                    >
                                                        <Edit2 size={16} /> Edit
                                                    </button>
                                                    <button
                                                        className="action-btn action-btn-view"
                                                        onClick={() => handleViewDetails(dealer)}
                                                    >
                                                        <Eye size={16} /> View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {showDetailsModal && selectedDealer && (
                        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '30px', borderRadius: '20px', maxWidth: '500px', width: '90%' }}>
                                <div className="modal-header" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>
                                    <h2 style={{ fontSize: '20px', margin: 0 }}>Dealer Details</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>ID</span>
                                        <span style={{ fontWeight: '600' }}>{selectedDealer.dealer_id}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Name</span>
                                        <span style={{ fontWeight: '600' }}>{selectedDealer.dealer_name}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px', gap: '20px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px', flexShrink: 0 }}>Email</span>
                                        <span style={{ fontWeight: '600', textAlign: 'right', wordBreak: 'break-all' }}>{selectedDealer.email || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Contact</span>
                                        <span style={{ fontWeight: '600' }}>{selectedDealer.contact_number}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Alt. Contact</span>
                                        <span style={{ fontWeight: '600' }}>{selectedDealer.alternative_contact || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Route</span>
                                        <span style={{ fontWeight: '600' }}>{selectedDealer.route || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px', gap: '20px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px', flexShrink: 0 }}>Address</span>
                                        <span style={{ fontWeight: '600', textAlign: 'right', wordBreak: 'break-word' }}>{selectedDealer.address || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Credit Limit</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {Number(selectedDealer.credit_limit || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Current Credit</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {Number(selectedDealer.current_credit || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Available Credit</span>
                                        <span style={{ fontWeight: '600' }}>Rs. {Number(selectedDealer.available_credit || 0).toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <span style={{ color: '#6b7280', minWidth: '120px' }}>Status</span>
                                        <span className={`badge ${getStatusBadgeClass(selectedDealer.status)}`}>{selectedDealer.status}</span>
                                    </div>
                                </div>
                                <button onClick={() => setShowDetailsModal(false)} style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#ff0000', color: 'white', cursor: 'pointer' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};

export default Dealers;
