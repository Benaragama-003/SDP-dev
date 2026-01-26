import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { MapPin, Truck, Plus, FileText } from 'lucide-react';
import '../../styles/Dispatch.css';

const AdminDispatch = () => {
    const navigate = useNavigate();
    const [selectedSupervisors, setSelectedSupervisors] = useState([]);
    const [allocatedItems, setAllocatedItems] = useState([{ product_id: '', quantity: '' }]);

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
                                    📍 Map View
                                    <small></small>
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
                                                {lorry.number}
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
                                                {sup.name}
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

                            <div className="allocation-section" style={{ marginTop: '30px', padding: '25px', backgroundColor: '#fdfdfd', borderRadius: '20px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 className="section-title" style={{ fontSize: '18px', margin: 0 }}>Product Allocation</h3>
                                    <button
                                        type="button"
                                        onClick={() => setAllocatedItems([...allocatedItems, { product_id: '', quantity: '' }])}
                                        style={{ backgroundColor: '#101540', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    >
                                        <Plus size={14} /> Add Product
                                    </button>
                                </div>

                                <div className="allocation-list">
                                    {allocatedItems.length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '14px', border: '1px dashed #ddd', borderRadius: '10px' }}>No products allocated yet. Click "Add Product" to start.</p>
                                    )}
                                    {allocatedItems.map((item, index) => (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 40px', gap: '15px', marginBottom: '12px', alignItems: 'center' }}>
                                            <select
                                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                value={item.product_id}
                                                onChange={(e) => {
                                                    const newItems = [...allocatedItems];
                                                    newItems[index].product_id = e.target.value;
                                                    setAllocatedItems(newItems);
                                                }}
                                                required
                                            >
                                                <option value="">Select Product</option>
                                                <option value="2kg">2kg Cylinder</option>
                                                <option value="5kg">5kg Cylinder</option>
                                                <option value="12.5kg">12.5kg Cylinder</option>
                                                <option value="37.5kg">37.5kg Cylinder</option>
                                                <option value="20kg">20kg Cylinder</option>
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                min="1"
                                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...allocatedItems];
                                                    newItems[index].quantity = e.target.value;
                                                    setAllocatedItems(newItems);
                                                }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setAllocatedItems(allocatedItems.filter((_, i) => i !== index))}
                                                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '30px' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                    <Truck size={20} />
                                    Confirm Dispatch & Allocation
                                </button>
                            </div>
                        </form>

                        {/* Recent Dispatches Section */}
                        <div className="dispatch-section" style={{ marginTop: '40px' }}>
                            <h3 className="section-title">Recent Dispatches</h3>
                            <div className="table-container" style={{ padding: '0', border: 'none', boxShadow: 'none' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Dispatch ID</th>
                                            <th>Date</th>
                                            <th>Lorry</th>
                                            <th>Supervisor</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Mocking mixed state dispatches */}
                                        {[
                                            { id: 'DSP-001', date: '2026-01-27', lorry: 'CAA-1234', supervisor: 'John Supervisor', status: 'scheduled' },
                                            { id: 'DSP-002', date: '2026-01-26', lorry: 'CAB-5678', supervisor: 'Jane Smith', status: 'awaiting-unload' },
                                            { id: 'DSP-003', date: '2026-01-26', lorry: 'CAC-9012', supervisor: 'Mike Johnson', status: 'in-progress' }
                                        ].map((dispatch) => (
                                            <tr key={dispatch.id}>
                                                <td style={{ fontWeight: '600' }}>{dispatch.id}</td>
                                                <td>{dispatch.date}</td>
                                                <td>{dispatch.lorry}</td>
                                                <td>{dispatch.supervisor}</td>
                                                <td>
                                                    <span className={`badge badge-${dispatch.status === 'scheduled' ? 'secondary' :
                                                        dispatch.status === 'awaiting-unload' ? 'warning' : 'primary'
                                                        }`}>
                                                        {dispatch.status.replace('-', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        {dispatch.status === 'scheduled' && (
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                style={{ fontSize: '12px', padding: '5px 10px' }}
                                                                onClick={() => alert(`Cancelling ${dispatch.id}`)}
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                        {dispatch.status === 'awaiting-unload' && (
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                style={{ fontSize: '12px', padding: '5px 10px', backgroundColor: '#101540', color: 'white', border: 'none' }}
                                                                onClick={() => alert(`Accepting Unload for ${dispatch.id}`)}
                                                            >
                                                                Accept Unload
                                                            </button>
                                                        )}
                                                        {(dispatch.status === 'in-progress') && (
                                                            <span style={{ fontSize: '12px', color: '#666' }}>No actions available</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default AdminDispatch;
