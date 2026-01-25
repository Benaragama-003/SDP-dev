import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { dealerApi } from '../../services/api';
import '../../styles/Dealers.css';

const AdminDealers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [dealers, setDealers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(null);

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

    const handleDelete = async (dealerId) => {
        if (window.confirm('Are you sure you want to delete this dealer? This will set their status to INACTIVE.')) {
            try {
                setDeleting(dealerId);
                await dealerApi.deleteDealer(dealerId);
                alert('Dealer deleted successfully!');
                // Refresh the dealer list
                fetchDealers();
            } catch (err) {
                console.error('Error deleting dealer:', err);
                alert(err.response?.data?.message || 'Failed to delete dealer');
            } finally {
                setDeleting(null);
            }
        }
    };

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

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Dealers Management</h1>
                            <p className="page-subtitle">Manage dealer network</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate('/admin/dealers/add')}>
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
                                <Loader2 size={40} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
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
                                                        onClick={() => navigate(`/admin/dealers/update/${dealer.dealer_id}`)}
                                                    >
                                                        <Edit2 size={16} /> Edit
                                                    </button>
                                                    <button
                                                        className="action-btn action-btn-delete"
                                                        onClick={() => handleDelete(dealer.dealer_id)}
                                                        disabled={deleting === dealer.dealer_id}
                                                    >
                                                        {deleting === dealer.dealer_id ? (
                                                            <Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                        {deleting === dealer.dealer_id ? ' Deleting...' : ' Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminDealers;
