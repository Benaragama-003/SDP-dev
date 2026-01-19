import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { MapPin, Truck, Plus, FileText } from 'lucide-react';
import '../../styles/Dispatch.css';

const AdminDispatch = () => {
    const navigate = useNavigate();
    const [selectedSupervisors, setSelectedSupervisors] = useState([]);

    // Mock supervisor data with locations
    const supervisors = [
        { id: 'S001', name: 'John Supervisor', route: 'Route A', location: { lat: 6.9271, lng: 79.8612 }, status: 'available' },
        { id: 'S002', name: 'Jane Smith', route: 'Route B', location: { lat: 6.9319, lng: 79.8478 }, status: 'on-duty' },
        { id: 'S003', name: 'Mike Johnson', route: 'Route C', location: { lat: 6.9022, lng: 79.8607 }, status: 'available' },
    ];

    const lorries = [
        { id: 'L001', number: 'CAA-1234', status: 'available', capacity: '5 tons' },
        { id: 'L002', number: 'CAB-5678', status: 'available', capacity: '5 tons' },
        { id: 'L003', number: 'CAC-9012', status: 'on-duty', capacity: '10 tons' },
    ];

    const handleCreateDispatch = (e) => {
        e.preventDefault();
        alert('Dispatch created successfully!');
    };

    return (
        <>
            <AdminSidebar />
            <div className="dispatch-container">
                <main className="dispatch-main">
                    <div className="page-header" style={{ position: 'relative' }}>
                        <div style={{ paddingRight: '160px' }}>
                            <h1 className="page-title">Dispatch Management</h1>
                            <p className="page-subtitle">Create and manage dispatch operations</p>
                        </div>
                        <button
                            className="btn"
                            style={{
                                position: 'absolute',
                                top: '0',
                                right: '0',
                                backgroundColor: '#101540',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                borderRadius: '10px',
                                fontWeight: '600',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => navigate('/admin/dispatch/history')}
                        >
                            <FileText size={20} />
                            View History
                        </button>
                    </div>

                    <div className="dispatch-content">
                        {/* Supervisor Locations Map Mock */}
                        <div className="dispatch-section">
                            <h3 className="section-title">
                                <MapPin size={20} />
                                Supervisor Locations
                            </h3>
                            <div className="location-map-mock">
                                <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                                    📍 Map View - Shows real-time supervisor locations
                                    <br />
                                    <small>(Integration with Google Maps API required)</small>
                                </p>
                            </div>
                        </div>

                        {/* Create Dispatch Form */}
                        <form onSubmit={handleCreateDispatch} className="dispatch-form">
                            <h3 className="section-title">Create New Dispatch</h3>

                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Select Lorry*</label>
                                    <select required>
                                        <option value="">Choose a lorry</option>
                                        {lorries.filter(l => l.status === 'available').map(lorry => (
                                            <option key={lorry.id} value={lorry.id}>
                                                {lorry.number} - {lorry.capacity}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Select Supervisor*</label>
                                    <select required>
                                        <option value="">Choose supervisor</option>
                                        {supervisors.filter(s => s.status === 'available').map(sup => (
                                            <option key={sup.id} value={sup.id}>
                                                {sup.name} - {sup.route}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Route*</label>
                                    <select required>
                                        <option value="">Select route</option>
                                        <option value="Route A">Route A</option>
                                        <option value="Route B">Route B</option>
                                        <option value="Route C">Route C</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Dispatch Date*</label>
                                    <input type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    <Truck size={20} />
                                    Create Dispatch
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminDispatch;
