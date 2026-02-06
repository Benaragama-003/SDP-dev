import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { MapPin, Truck, Plus, FileText, RefreshCw } from 'lucide-react';
import '../../styles/Dispatch.css';
import { formatDate } from '../../utils/dateUtils';
import DateInput from '../../components/DateInput';
import { dispatchApi } from '../../services/api';

const AdminDispatch = () => {
    const navigate = useNavigate();
    const [allocatedItems, setAllocatedItems] = useState([{ product_id: '', quantity: '' }]);
    const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedLorry, setSelectedLorry] = useState('');
    const [selectedSupervisor, setSelectedSupervisor] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    
    // Real data from API
    const [supervisors, setSupervisors] = useState([]);
    const [lorries, setLorries] = useState([]);
    const [products, setProducts] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [dispatches, setDispatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Fetch resources and dispatches on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resourcesRes, dispatchesRes] = await Promise.all([
                dispatchApi.getResources(),
                dispatchApi.getAll({ status: 'SCHEDULED,IN_PROGRESS,AWAITING_UNLOAD', limit: 10 })
            ]);
            
            console.log('Resources:', resourcesRes.data);
            console.log('Dispatches:', dispatchesRes.data);
            
            setSupervisors(resourcesRes.data.data?.supervisors || []);
            setLorries(resourcesRes.data.data?.lorries || []);
            setProducts(resourcesRes.data.data?.products || []);
            setRoutes(resourcesRes.data.data?.routes || []);
            setDispatches(dispatchesRes.data.data?.dispatches || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            console.error('Error response:', error.response?.data);
            alert('Failed to load dispatch data: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDispatch = async (e) => {
        e.preventDefault();
        
        // Validate items
        const validItems = allocatedItems.filter(item => item.product_id && item.quantity > 0);
        if (validItems.length === 0) {
            alert('Please add at least one product to the dispatch');
            return;
        }
        
        setSubmitting(true);
        try {
            await dispatchApi.create({
                lorry_id: selectedLorry,
                supervisor_id: selectedSupervisor,
                route: selectedRoute,
                dispatch_date: dispatchDate,
                items: validItems.map(item => ({
                    product_id: item.product_id,
                    loaded_quantity: parseInt(item.quantity)
                }))
            });
            
            alert('Dispatch created successfully!');
            // Reset form
            setSelectedLorry('');
            setSelectedSupervisor('');
            setSelectedRoute('');
            setAllocatedItems([{ product_id: '', quantity: '' }]);
            setDispatchDate(new Date().toISOString().split('T')[0]);
            // Refresh data
            fetchData();
        } catch (error) {
            console.error('Failed to create dispatch:', error);
            alert(error.response?.data?.message || 'Failed to create dispatch');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelDispatch = async (dispatchId) => {
        if (!window.confirm('Are you sure you want to cancel this dispatch?')) return;
        
        try {
            await dispatchApi.cancel(dispatchId);
            alert('Dispatch cancelled successfully');
            fetchData();
        } catch (error) {
            console.error('Failed to cancel dispatch:', error);
            alert(error.response?.data?.message || 'Failed to cancel dispatch');
        }
    };

    const handleAcceptUnload = async (dispatchId) => {
        if (!window.confirm('Accept unload and return remaining stock to warehouse?')) return;
        
        try {
            await dispatchApi.acceptUnload(dispatchId);
            alert('Unload accepted. Stock returned to warehouse.');
            fetchData();
        } catch (error) {
            console.error('Failed to accept unload:', error);
            alert(error.response?.data?.message || 'Failed to accept unload');
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'SCHEDULED': return 'badge-secondary';
            case 'IN_PROGRESS': return 'badge-primary';
            case 'AWAITING_UNLOAD': return 'badge-warning';
            case 'UNLOADED': return 'badge-success';
            case 'CANCELLED': return 'badge-danger';
            default: return 'badge-secondary';
        }
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

                            {loading ? (
                                <p style={{ textAlign: 'center', padding: '20px' }}>Loading resources...</p>
                            ) : (
                            <>
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Select Lorry* {lorries.length === 0 && <span style={{ color: '#999', fontSize: '12px' }}>(No available lorries)</span>}</label>
                                    <select required value={selectedLorry} onChange={(e) => setSelectedLorry(e.target.value)}>
                                        <option value="">Choose a lorry</option>
                                        {lorries.map(lorry => (
                                            <option key={lorry.lorry_id} value={lorry.lorry_id}>
                                                {lorry.plate_number} 
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Select Supervisor* {supervisors.length === 0 && <span style={{ color: '#999', fontSize: '12px' }}>(No available supervisors)</span>}</label>
                                    <select required value={selectedSupervisor} onChange={(e) => setSelectedSupervisor(e.target.value)}>
                                        <option value="">Choose supervisor</option>
                                        {supervisors.map(sup => (
                                            <option key={sup.user_id} value={sup.user_id}>
                                                {sup.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Route*</label>
                                    <select required value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)}>
                                        <option value="">Select route</option>
                                        {routes.map(route => (
                                            <option key={route} value={route}>{route}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>Dispatch Date*</label>
                                    <DateInput
                                        value={dispatchDate}
                                        onChange={setDispatchDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
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
                                    {allocatedItems.map((item, index) => {
                                        const selectedProduct = products.find(p => p.product_id === item.product_id);
                                        return (
                                        <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: '15px', marginBottom: '12px', alignItems: 'center' }}>
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
                                                {products.map(product => (
                                                    <option key={product.product_id} value={product.product_id}>
                                                        {product.size} - {product.type} (Avail: {product.filled_stock})
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                placeholder="Qty"
                                                min="1"
                                                max={selectedProduct?.filled_stock || 999}
                                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const newItems = [...allocatedItems];
                                                    newItems[index].quantity = e.target.value;
                                                    setAllocatedItems(newItems);
                                                }}
                                                required
                                            />
                                            <span style={{ fontSize: '12px', color: '#666' }}>
                                                {selectedProduct ? `Max: ${selectedProduct.filled_stock}` : ''}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAllocatedItems(allocatedItems.filter((_, i) => i !== index))}
                                                style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '30px' }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                                    <Truck size={20} />
                                    {submitting ? 'Creating...' : 'Confirm Dispatch & Allocation'}
                                </button>
                            </div>
                            </>
                            )}
                        </form>

                        {/* Recent Dispatches Section */}
                        <div className="dispatch-section" style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 className="section-title" style={{ margin: 0 }}>Recent Dispatches</h3>
                                <button
                                    type="button"
                                    onClick={fetchData}
                                    style={{ backgroundColor: 'transparent', border: '1px solid #ddd', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <RefreshCw size={14} /> Refresh
                                </button>
                            </div>
                            <div className="table-container" style={{ padding: '0', border: 'none', boxShadow: 'none' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Dispatch ID</th>
                                            <th>Date</th>
                                            <th>Lorry</th>
                                            <th>Supervisor</th>
                                            <th>Route</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dispatches.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                                                    No active dispatches found
                                                </td>
                                            </tr>
                                        ) : (
                                        dispatches.map((dispatch) => (
                                            <tr key={dispatch.dispatch_id}>
                                                <td style={{ fontWeight: '600' }}>{dispatch.dispatch_id}</td>
                                                <td>{formatDate(dispatch.dispatch_date)}</td>
                                                <td>{dispatch.plate_number}</td>
                                                <td>{dispatch.supervisor_name}</td>
                                                <td>{dispatch.route}</td>
                                                <td>
                                                    <span className={`badge ${getStatusBadgeClass(dispatch.status)}`}>
                                                        {dispatch.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                        {dispatch.status === 'SCHEDULED' && (
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                style={{ fontSize: '12px', padding: '5px 10px' }}
                                                                onClick={() => handleCancelDispatch(dispatch.dispatch_id)}
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
                                                        {dispatch.status === 'AWAITING_UNLOAD' && (
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                style={{ fontSize: '12px', padding: '5px 10px', backgroundColor: '#28a745', color: 'white', border: 'none' }}
                                                                onClick={() => handleAcceptUnload(dispatch.dispatch_id)}
                                                            >
                                                                Accept Unload
                                                            </button>
                                                        )}
                                                        {dispatch.status === 'IN_PROGRESS' && (
                                                            <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>In progress...</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                        )}
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
