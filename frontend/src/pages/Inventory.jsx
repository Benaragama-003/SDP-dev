import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../services/api';
import '../styles/Inventory.css';

const Inventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryData, setInventoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [dealers] = useState([]); // Will load from API later

    const [damageData, setDamageData] = useState({
        productId: '',
        dealerId: '',
        quantity: '',
        reason: ''
    });

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

    const handleDamageReport = (e) => {
        e.preventDefault();
        console.log('Damage Data Submitted:', damageData);
        alert(`Damage Report submitted successfully!`);
        setShowDamageModal(false);
        setDamageData({ productId: '', dealerId: '', quantity: '', reason: '' });
    };

    const filteredData = (inventoryData || []).filter((item) =>
        item.cylinder_size.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Sidebar />
            <div className="inventory-container">
                <main className="inventory-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Inventory Management</h1>
                            <p className="page-subtitle">Monitor gas cylinder inventory levels</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-danger" style={{ backgroundColor: '#dc3545', color: 'white' }} onClick={() => setShowDamageModal(true)}>
                                <AlertTriangle size={20} />
                                Report Damage
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Product Stock Levels</h3>
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
                                            <select
                                                required
                                                value={damageData.productId}
                                                onChange={(e) => setDamageData({ ...damageData, productId: e.target.value })}
                                            >
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
                                            <input
                                                type="number"
                                                required
                                                placeholder="0"
                                                min="1"
                                                value={damageData.quantity}
                                                onChange={(e) => setDamageData({ ...damageData, quantity: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Reason / Notes</label>
                                            <textarea
                                                required
                                                placeholder="Describe the damage..."
                                                rows="3"
                                                value={damageData.reason}
                                                onChange={(e) => setDamageData({ ...damageData, reason: e.target.value })}
                                            ></textarea>
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

export default Inventory;
