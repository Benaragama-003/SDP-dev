import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, DollarSign, Edit2, Loader2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import '../../styles/Inventory.css';

const AdminInventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryData, setInventoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPriceUpdate, setShowPriceUpdate] = useState(false);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [dealers] = useState([]); // Could be fetched from API later

    const navigate = useNavigate();

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/products/inventory');
            setInventoryData(response.data.data);
        } catch (err) {
            console.error("Failed to fetch inventory", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const filteredData = (inventoryData || []).filter((item) =>
        item.cylinder_size.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePriceUpdate = (e) => {
        e.preventDefault();
        alert('Price updates will be implemented soon!');
        setShowPriceUpdate(false);
    };

    const handleDamageReport = (e) => {
        e.preventDefault();
        alert('Damage reporting will be implemented soon!');
        setShowDamageModal(false);
    };

    return (
        <>
            <AdminSidebar />
            <div className="inventory-container">
                <main className="inventory-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Inventory Management</h1>
                            <p className="page-subtitle">Manage stock and pricing breakdown</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/admin/inventory/add')}>
                                <Plus size={20} />
                                Add Product
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowPriceUpdate(true)}>
                                <DollarSign size={20} />
                                Update Prices
                            </button>
                            <button className="btn btn-danger" style={{ backgroundColor: '#dc3545', color: 'white' }} onClick={() => setShowDamageModal(true)}>
                                <AlertTriangle size={20} />
                                Report Damage
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Product SKUs</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search size..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Cylinder Size</th>
                                    <th>Filled</th>
                                    <th>Empty</th>
                                    <th>Damaged</th>
                                    <th>New</th>
                                    <th>Total Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                            <Loader2 className="spinner" size={30} style={{ margin: '0 auto' }} />
                                            <p style={{ marginTop: '10px' }}>Loading inventory...</p>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                            No products found in inventory.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: '600' }}>{item.cylinder_size}</td>
                                            <td>{item.filled}</td>
                                            <td>{item.empty}</td>
                                            <td style={{ color: '#dc3545' }}>{item.damaged}</td>
                                            <td>{item.new_stock}</td>
                                            <td style={{ fontWeight: 'bold' }}>
                                                {item.filled + item.empty + item.damaged + item.new_stock}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Price Update Modal */}
                {showPriceUpdate && (
                    <div className="modal-overlay" onClick={() => setShowPriceUpdate(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Bulk Price Update</h2>
                                <button className="modal-close" onClick={() => setShowPriceUpdate(false)}>×</button>
                            </div>
                            <form onSubmit={handlePriceUpdate}>
                                <div className="modal-body">
                                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                            <label>Select Cylinder Size</label>
                                            <select required>
                                                <option value="">Select size...</option>
                                                {inventoryData.map((item, idx) => (
                                                    <option key={idx} value={item.cylinder_size}>
                                                        {item.cylinder_size}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Update Filled Price (Rs)</label>
                                            <input type="number" placeholder="New price" />
                                        </div>
                                        <div className="form-field">
                                            <label>Update New Price (Rs)</label>
                                            <input type="number" placeholder="New price" />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-danger" onClick={() => setShowPriceUpdate(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Update Prices</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Damage Report Modal */}
                {showDamageModal && (
                    <div className="modal-overlay" onClick={() => setShowDamageModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Report Damage Inventory</h2>
                                <button className="modal-close" onClick={() => setShowDamageModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleDamageReport}>
                                <div className="modal-body">
                                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                        <div className="form-field">
                                            <label>Product (Cylinder Size)</label>
                                            <select required>
                                                <option value="">Select Size...</option>
                                                {inventoryData.map((item, idx) => (
                                                    <option key={idx} value={item.cylinder_size}>
                                                        {item.cylinder_size}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Quantity Damaged</label>
                                            <input type="number" required placeholder="0" min="1" />
                                        </div>
                                        <div className="form-field">
                                            <label>Reason / Notes</label>
                                            <textarea required placeholder="Describe the damage..." rows="3"></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDamageModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-danger" style={{ backgroundColor: '#dc3545', color: 'white' }}>Submit Report</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminInventory;
