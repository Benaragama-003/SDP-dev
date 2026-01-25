import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import { Save, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dealerApi } from '../services/api';
import '../styles/Dealers.css';

const DealerAdd = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dealerData, setDealerData] = useState({
        dealer_name: '',
        contact_number: '',
        alternative_contact: '',
        email: '',
        address: '',
        route: '',
        credit_limit: '',
        payment_terms_days: '30',
        notes: ''
    });

    const handleChange = (e) => {
        setDealerData({
            ...dealerData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError(null);

            // Prepare data for backend
            const dataToSubmit = {
                dealer_name: dealerData.dealer_name,
                contact_number: dealerData.contact_number,
                address: dealerData.address,
                route: dealerData.route, // Now required
                alternative_contact: dealerData.alternative_contact || undefined,
                email: dealerData.email || undefined,
                credit_limit: dealerData.credit_limit ? Number(dealerData.credit_limit) : 0,
                payment_terms_days: dealerData.payment_terms_days ? Number(dealerData.payment_terms_days) : 30,
                notes: dealerData.notes || undefined
            };

            const response = await dealerApi.createDealer(dataToSubmit);
            alert(`Dealer "${response.data.data.dealer_name}" created successfully!`);
            navigate(isAdmin ? '/admin/dealers' : '/dealers');
        } catch (err) {
            console.error('Error creating dealer:', err);
            setError(err.response?.data?.message || 'Failed to create dealer');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate(isAdmin ? '/admin/dealers' : '/dealers');
    };

    return (
        <>
            {isAdmin ? <AdminSidebar /> : <Sidebar />}
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Add New Dealer</h1>
                            <p className="page-subtitle">Register a new dealer in the system</p>
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="dealer-form">
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Dealer Name*</label>
                                <input
                                    type="text"
                                    name="dealer_name"
                                    value={dealerData.dealer_name}
                                    onChange={handleChange}
                                    required
                                    minLength={2}
                                    maxLength={100}
                                />
                            </div>
                            <div className="form-field">
                                <label>Contact Number*</label>
                                <input
                                    type="tel"
                                    name="contact_number"
                                    value={dealerData.contact_number}
                                    onChange={handleChange}
                                    required
                                    pattern="0[0-9]{9}"
                                    placeholder="0771234567"
                                    title="10 digits starting with 0"
                                />
                            </div>
                            <div className="form-field">
                                <label>Alternative Contact</label>
                                <input
                                    type="tel"
                                    name="alternative_contact"
                                    value={dealerData.alternative_contact}
                                    onChange={handleChange}
                                    pattern="0[0-9]{9}"
                                    placeholder="0771234567"
                                    title="10 digits starting with 0"
                                />
                            </div>
                            <div className="form-field">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={dealerData.email}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-field">
                                <label>Route*</label>
                                <input
                                    type="text"
                                    name="route"
                                    value={dealerData.route}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g., Ratnapura"
                                />
                            </div>
                            <div className="form-field">
                                <label>Credit Limit (Rs.)</label>
                                <input
                                    type="number"
                                    name="credit_limit"
                                    value={dealerData.credit_limit}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                />
                            </div>

                            <div className="form-field full-width">
                                <label>Address*</label>
                                <textarea
                                    name="address"
                                    value={dealerData.address}
                                    onChange={handleChange}
                                    required
                                    rows={3}
                                />
                            </div>
                            <div className="form-field full-width">
                                <label>Notes</label>
                                <textarea
                                    name="notes"
                                    value={dealerData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="Additional information about the dealer"
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={loading}
                                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Save Dealer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default DealerAdd;
