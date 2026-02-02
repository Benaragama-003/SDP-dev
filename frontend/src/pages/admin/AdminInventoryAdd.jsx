import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, Loader2 } from 'lucide-react';
import api from '../../services/api';
import '../../styles/Inventory.css';

const AdminInventoryAdd = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        cylinder_size: '',
        filled_purchase_price: '',
        new_purchase_price: '',
        filled_selling_price: '',
        new_selling_price: '',
    });

    // Format number with thousand separators
    const formatNumber = (value) => {
        if (!value) return '';
        const num = value.toString().replace(/,/g, '');
        if (isNaN(num)) return value;
        return Number(num).toLocaleString('en-IN');
    };

    // Remove formatting and get raw number
    const parseNumber = (value) => {
        return value.toString().replace(/,/g, '');
    };

    // Handle price input change
    const handlePriceChange = (field, value) => {
        const rawValue = parseNumber(value);
        if (rawValue === '' || !isNaN(rawValue)) {
            setFormData({ ...formData, [field]: rawValue });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/products', formData);
            alert('Product added successfully!');
            navigate('/admin/inventory');
        } catch (err) {
            console.error('Failed to add product:', err);
            setError(err.response?.data?.message || 'Failed to add product. Please try again.');
        } finally {
            setLoading(false);
        }
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

                    {error && (
                        <div className="error-message" style={{ maxWidth: '600px', margin: '0 auto 20px auto', padding: '15px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '10px' }}>
                            {error}
                        </div>
                    )}

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
                                        placeholder="Enter size (e.g., 5kg, 12.5kg)"
                                        value={formData.cylinder_size}
                                        onChange={(e) => setFormData({ ...formData, cylinder_size: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-field">
                                        <label>Filled Purchase Price (Rs)*</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="0"
                                            value={formatNumber(formData.filled_purchase_price)}
                                            onChange={(e) => handlePriceChange('filled_purchase_price', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>New Purchase Price (Rs)*</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="0"
                                            value={formatNumber(formData.new_purchase_price)}
                                            onChange={(e) => handlePriceChange('new_purchase_price', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div className="form-field">
                                        <label>Filled Selling Price (Rs)*</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="0"
                                            value={formatNumber(formData.filled_selling_price)}
                                            onChange={(e) => handlePriceChange('filled_selling_price', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>New Selling Price (Rs)*</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="0"
                                            value={formatNumber(formData.new_selling_price)}
                                            onChange={(e) => handlePriceChange('new_selling_price', e.target.value)}
                                        />
                                    </div>
                                </div>
                    
                            </div>
                        </div>

                        <div className="form-actions" style={{ justifyContent: 'flex-end', marginTop: '30px' }}>
                            <button
                                type="button"
                                onClick={() => navigate('/admin/inventory')}
                                disabled={loading}
                                style={{ backgroundColor: '#ff0000', color: 'white', border: 'none', padding: '10px 25px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {loading ? <Loader2 className="spinner" size={20} /> : <Save size={20} />}
                                {loading ? 'Saving...' : 'Add Product'}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default AdminInventoryAdd;
