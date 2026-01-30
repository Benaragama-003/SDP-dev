import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, Loader2 } from 'lucide-react';
import api from '../../services/api';
import '../../styles/Dealers.css';

const LorryAdd = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [formData, setFormData] = useState({
        vehicle_number: '',
        vehicle_model: '',
        last_service_date: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/lorries', formData);
            alert('Lorry added successfully!');
            navigate('/admin/lorries');
        } catch (err) {
            console.error('Failed to add lorry:', err);
            setError(err.response?.data?.message || 'Failed to add lorry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Add New Lorry</h1>
                            <p className="page-subtitle">Register a new vehicle to the fleet</p>
                        </div>
                    </div>

                    {error && (
                        <div style={{ maxWidth: '600px', margin: '0 auto 20px', padding: '15px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className="form-section">
                            <h3 className="section-title">Vehicle Details</h3>
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div className="form-field">
                                    <label>License Plate Number*</label>
                                    <input 
                                        type="text" 
                                        name="vehicle_number"
                                        placeholder="e.g. CAA-1234" 
                                        value={formData.vehicle_number}
                                        onChange={handleChange}
                                        required 
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Vehicle Model</label>
                                    <input 
                                        type="text" 
                                        name="vehicle_model"
                                        placeholder="e.g. Isuzu Elf" 
                                        value={formData.vehicle_model}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Last Service Date*</label>
                                    <input 
                                        type="date" 
                                        name="last_service_date"
                                        value={formData.last_service_date}
                                        onChange={handleChange}
                                        required
                                    />
                                    <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                        Next service will be automatically set to 3 months from this date
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/lorries')} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? <Loader2 size={20} className="spinning" /> : <Save size={20} />}
                                {loading ? 'Saving...' : 'Save Vehicle'}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default LorryAdd;
