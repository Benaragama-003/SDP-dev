import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, AlertTriangle } from 'lucide-react';
import '../styles/Inventory.css';

const Inventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showDamageModal, setShowDamageModal] = useState(false);

    // Mock grouped inventory data (Same as admin)
    const inventoryGrouped = [
        { size: '2.3 kg', filled: 50, empty: 30, damaged: 5, newCount: 20 },
        { size: '5.0 kg', filled: 150, empty: 80, damaged: 12, newCount: 45 },
        { size: '12.5 kg', filled: 200, empty: 120, damaged: 8, newCount: 60 },
        { size: '37.5 kg', filled: 100, empty: 60, damaged: 4, newCount: 25 },
    ];

    const filteredData = inventoryGrouped.filter((item) =>
        item.size.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDamageReport = (e) => {
        e.preventDefault();
        alert('Damage Report Submitted Successfully!');
        setShowDamageModal(false);
    };

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
                                {filteredData.map((item, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: '600' }}>{item.size}</td>
                                        <td>{item.filled}</td>
                                        <td>{item.empty}</td>
                                        <td style={{ color: '#dc3545' }}>{item.damaged}</td>
                                        <td>{item.newCount}</td>
                                        <td style={{ fontWeight: 'bold' }}>
                                            {item.filled + item.empty + item.damaged + item.newCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Damage Report Modal (Simple Version for now) */}
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
                                                {inventoryGrouped.map((item, idx) => (
                                                    <option key={idx} value={item.size}>
                                                        {item.size}
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

export default Inventory;

