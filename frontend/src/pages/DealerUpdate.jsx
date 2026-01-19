import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import { Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Dealers.css';

const DealerUpdate = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const [dealerData, setDealerData] = useState({
        name: '',
        contact: '',
        address: '',
        route: '',
        creditLimit: '',
        email: ''
    });

    useEffect(() => {
        // Mock fetch dealer data
        setDealerData({
            name: 'ABC Stores',
            contact: '0771234567',
            address: '123 Main St, Colombo',
            route: 'Route A',
            creditLimit: '50000',
            email: 'abc@example.com'
        });
    }, [id]);

    const handleChange = (e) => {
        setDealerData({
            ...dealerData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Updated Dealer:', dealerData);
        alert('Dealer updated successfully!');
        navigate(isAdmin ? '/admin/dealers' : '/dealers');
    };

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
                            <button type="button" className="btn btn-outline" onClick={() => navigate(isAdmin ? '/admin/dealers' : '/dealers')}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Save size={20} />
                                Update Dealer
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default DealerUpdate;
