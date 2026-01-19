import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import { Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dealers.css';

const DealerAdd = () => {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [dealerData, setDealerData] = useState({
        name: '',
        contact: '',
        address: '',
        route: '',
        creditLimit: '',
        email: ''
    });

    const handleChange = (e) => {
        setDealerData({
            ...dealerData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('New Dealer:', dealerData);
        // In a real app, this would be an API call
        alert('Dealer Added Successfully! (Mock)');
        navigate(isAdmin ? '/admin/dealers' : '/dealers');
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

                    <form onSubmit={handleSubmit} className="dealer-form">
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Dealer Name*</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={dealerData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-field">
                                <label>Contact Number*</label>
                                <input
                                    type="tel"
                                    name="contact"
                                    value={dealerData.contact}
                                    onChange={handleChange}
                                    required
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
                                <select name="route" value={dealerData.route} onChange={handleChange} required>
                                    <option value="">Select Route</option>
                                    <option value="Route A">Route A</option>
                                    <option value="Route B">Route B</option>
                                    <option value="Route C">Route C</option>
                                </select>
                            </div>
                            <div className="form-field">
                                <label>Credit Limit (Rs.)*</label>
                                <input
                                    type="number"
                                    name="creditLimit"
                                    value={dealerData.creditLimit}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-field full-width">
                                <label>Address*</label>
                                <textarea
                                    name="address"
                                    value={dealerData.address}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" onClick={handleCancel} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Save size={20} />
                                Save Dealer
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default DealerAdd;
