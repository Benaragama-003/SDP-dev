import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, Package } from 'lucide-react';
import '../../styles/Inventory.css';

const AdminInventoryAdd = () => {
    const navigate = useNavigate();

    const [productType, setProductType] = useState('Cylinder');
    const [filledPrice, setFilledPrice] = useState('');
    const [newPrice, setNewPrice] = useState('');

    const emptyPrice = (newPrice && filledPrice) ? (Number(newPrice) - Number(filledPrice)) : 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Product Added Successfully!');
        navigate('/admin/inventory');
    };

    return (
        <>
            <AdminSidebar />
            <div className="inventory-container">
                <main className="inventory-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Add New Product</h1>
                            <p className="page-subtitle">Add a new cylinder or accessory to inventory</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className="form-section">
                            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div className="form-field">
                                    <label>Product Type*</label>
                                    <select
                                        required
                                        value={productType}
                                        onChange={(e) => setProductType(e.target.value)}
                                    >
                                        <option value="Cylinder">Gas Cylinder (General)</option>
                                        <option value="Cylinder Filled">Gas Cylinder (Filled)</option>
                                        <option value="Cylinder New">Gas Cylinder (New)</option>
                                        <option value="Accessory">Accessory</option>
                                        <option value="Regulator">Regulator</option>
                                    </select>
                                </div>
                                <div className="form-field">
                                    <label>Size / Weight*</label>
                                    <input type="text" required placeholder="e.g. 12.5 kg" />
                                </div>
                                <div className="form-field">
                                    <label>Initial Stock Quantity*</label>
                                    <input type="number" required placeholder="0" />
                                </div>
                                {productType.includes('Cylinder') && (
                                    <>
                                        <div className="form-field">
                                            <label>Filled Price (Rs)*</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                value={filledPrice}
                                                onChange={(e) => setFilledPrice(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>New Price (Cylinder + Gas) (Rs)*</label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="0.00"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Empty Price (Calculated)</label>
                                            <input
                                                type="number"
                                                readOnly
                                                value={emptyPrice}
                                                style={{ backgroundColor: '#f0f0f0' }}
                                            />
                                            <small style={{ color: '#666' }}>Empty = New - Filled</small>
                                        </div>
                                    </>
                                )}
                                {!productType.includes('Cylinder') && (
                                    <div className="form-field">
                                        <label>Unit Price (Rs)*</label>
                                        <input type="number" required placeholder="0.00" />
                                    </div>
                                )}
                                <div className="form-field">
                                    <label>Dealer Price (Rs)*</label>
                                    <input type="number" required placeholder="0.00" title="Price sold to dealers" />
                                </div>
                                <div className="form-field">
                                    <label>Reorder Level</label>
                                    <input type="number" placeholder="Minimum stock alert level" />
                                </div>
                            </div>
                        </div>

                        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button type="button" onClick={() => navigate('/admin/inventory')} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Save size={20} />
                                Add Product
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default AdminInventoryAdd;
