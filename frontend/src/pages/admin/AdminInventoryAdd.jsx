import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, Package } from 'lucide-react';
import '../../styles/Inventory.css';

const AdminInventoryAdd = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        size: '',
        supplier_filled: '',
        supplier_new: '',
        dealer_filled: '',
        dealer_new: '',
        reorder_level: '100'
    });

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
                                    <label>Product Type</label>
                                    <input type="text" value="Gas Cylinder" readOnly style={{ backgroundColor: '#f5f5f5' }} />
                                </div>
                                <div className="form-field">
                                    <label>Size (e.g. 12.5kg)*</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter size"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-field">
                                        <label>Filled Price (Supplier) (Rs)*</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.supplier_filled}
                                            onChange={(e) => setFormData({ ...formData, supplier_filled: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>New Price (Supplier) (Rs)*</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.supplier_new}
                                            onChange={(e) => setFormData({ ...formData, supplier_new: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-field">
                                        <label>Filled Price (Dealer) (Rs)*</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.dealer_filled}
                                            onChange={(e) => setFormData({ ...formData, dealer_filled: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>New Price (Dealer) (Rs)*</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.dealer_new}
                                            onChange={(e) => setFormData({ ...formData, dealer_new: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>Reorder Level</label>
                                    <input
                                        type="number"
                                        placeholder="100"
                                        value={formData.reorder_level}
                                        onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                                    />
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
