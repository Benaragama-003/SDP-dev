import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import { Save, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dealerApi } from '../services/api';
import '../styles/Dealers.css';

const DealerUpdate = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [dealerData, setDealerData] = useState({
        dealer_name: '',
        contact_number: '',
        alternative_contact: '',
        email: '',
        address: '',
        route: '',
        credit_limit: '',
        payment_terms_days: '',
        status: 'ACTIVE',
        notes: ''
    });

    useEffect(() => {
        fetchDealerData();
    }, [id]);

    const fetchDealerData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await dealerApi.getDealerById(id);
            const dealer = response.data.data;

            setDealerData({
                dealer_name: dealer.dealer_name || '',
                contact_number: dealer.contact_number || '',
                alternative_contact: dealer.alternative_contact || '',
                email: dealer.email || '',
                address: dealer.address || '',
                route: dealer.route || '',
                credit_limit: dealer.credit_limit || '',
                payment_terms_days: dealer.payment_terms_days || '',
                status: dealer.status || 'ACTIVE',
                notes: dealer.notes || ''
            });
        } catch (err) {
            console.error('Error fetching dealer:', err);
            setError(err.response?.data?.message || 'Failed to fetch dealer');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setDealerData({
            ...dealerData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSubmitting(true);
            setError(null);

            // Prepare data for backend
            const dataToSubmit = {
                dealer_name: dealerData.dealer_name,
                contact_number: dealerData.contact_number,
                address: dealerData.address,
                route: dealerData.route,
                alternative_contact: dealerData.alternative_contact || undefined,
                email: dealerData.email || undefined,
                credit_limit: dealerData.credit_limit ? Number(dealerData.credit_limit) : undefined,
                payment_terms_days: dealerData.payment_terms_days ? Number(dealerData.payment_terms_days) : undefined,
                status: dealerData.status,
                notes: dealerData.notes || undefined
            };

            await dealerApi.updateDealer(id, dataToSubmit);
            alert('Dealer updated successfully!');
            navigate(isAdmin ? '/admin/dealers' : '/dealers');
        } catch (err) {
            console.error('Error updating dealer:', err);
            setError(err.response?.data?.message || 'Failed to update dealer');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                {isAdmin ? <AdminSidebar /> : <Sidebar />}
                <div className="dealers-container">
                    <main className="dealers-main">
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
                            <Loader2 size={50} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    </main>
                </div>
            </>
        );
    }

    return (
        <>
            {isAdmin ? <AdminSidebar /> : <Sidebar />}
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Update Dealer</h1>
                            <p className="page-subtitle">Edit dealer information</p>
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
                                className="btn btn-danger"
                                onClick={() => navigate(isAdmin ? '/admin/dealers' : '/dealers')}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Update Dealer
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

export default DealerUpdate;
