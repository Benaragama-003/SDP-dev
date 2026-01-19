import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, Truck } from 'lucide-react';
import '../../styles/Dealers.css';

const LorryAdd = () => {
    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Lorry Added Successfully!');
        window.history.back();
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

                    <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className="form-section">
                            <h3 className="section-title">Vehicle Details</h3>
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div className="form-field">
                                    <label>License Plate Number*</label>
                                    <input type="text" placeholder="e.g. CAA-1234" required />
                                </div>
                                <div className="form-field">
                                    <label>Vehicle Model</label>
                                    <input type="text" placeholder="e.g. Isuzu Elf" />
                                </div>
                                <div className="form-field">
                                    <label>Load Capacity*</label>
                                    <select required>
                                        <option value="">Select Capacity</option>
                                        <option value="5 tons">5 Tons</option>
                                        <option value="10 tons">10 Tons</option>
                                        <option value="15 tons">15 Tons</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Initial Mileage (km)</label>
                                    <input type="number" placeholder="0" />
                                </div>
                            </div>
                        </div>

                        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Save size={20} />
                                Save Vehicle
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default LorryAdd;
