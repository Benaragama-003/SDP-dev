import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, DollarSign, Edit2 } from 'lucide-react';
import '../../styles/Inventory.css';

const AdminInventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showPriceUpdate, setShowPriceUpdate] = useState(false);

    const [showDamageModal, setShowDamageModal] = useState(false);

    const navigate = useNavigate();

    // Mock grouped inventory data
    const inventoryGrouped = [
        { size: '2kg', filled: 50, empty: 30, damaged: 5, newCount: 20 },
        { size: '5kg', filled: 150, empty: 80, damaged: 12, newCount: 45 },
        { size: '12.5kg', filled: 200, empty: 120, damaged: 8, newCount: 60 },
        { size: '37.5kg', filled: 100, empty: 60, damaged: 4, newCount: 25 },
    ];

    // Mock dealers data for the damage report modal
    const [dealers] = useState([
        { id: 'D001', name: 'A.N.G. Enterprises (Pvt) Ltd' },
        { id: 'D002', name: 'Ratnapura Gas Center' },
        { id: 'D003', name: 'Sabaragamuwa Dealers' },
    ]);

    const filteredData = inventoryGrouped.filter((item) =>
        item.size.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePriceUpdate = (e) => {
        e.preventDefault();
        alert('Prices Updated Successfully! (Mock)');
        setShowPriceUpdate(false);
    };

    const handleDamageReport = (e) => {
        e.preventDefault();
        alert('Damage Report Submitted Successfully!');
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
                                <Edit2 size={20} />
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

                {/* Price Update Modal */}
                {
                    showPriceUpdate && (
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
                                                    <option value="all">All Sizes</option>
                                                    <option value="2kg">2kg</option>
                                                    <option value="5kg">5kg</option>
                                                    <option value="12.5kg">12.5kg</option>
                                                    <option value="37.5kg">37.5kg</option>
                                                </select>
                                            </div>
                                            <div className="form-field">
                                                <label>Update Filled Price (Rs)</label>
                                                <input type="number" placeholder="New price or leave empty" />
                                            </div>
                                            <div className="form-field">
                                                <label>Update New Price (Rs)</label>
                                                <input type="number" placeholder="New price or leave empty" />
                                            </div>
                                            <div className="form-field">
                                                <label>Update Supplier Filled Price (Rs)</label>
                                                <input type="number" placeholder="New price or leave empty" />
                                            </div>
                                            <div className="form-field">
                                                <label>Update Supplier New Price (Rs)</label>
                                                <input type="number" placeholder="New price or leave empty" />
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                                            Note: Entering a value will override the current price for all selected sizes.
                                        </p>
                                    </div>
                                    <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                        <button type="button" className="btn btn-danger" onClick={() => setShowPriceUpdate(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary">Update Prices</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Damage Report Modal */}
                {
                    showDamageModal && (
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
                                                <label>Dealer Who Reported (Optional)</label>
                                                <select>
                                                    <option value="">Internal / No Dealer</option>
                                                    {dealers.map(dealer => (
                                                        <option key={dealer.id} value={dealer.id}>
                                                            {dealer.name}
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
                    )
                }
            </div >
        </>
    );
};

export default AdminInventory;
