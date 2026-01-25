import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Save, X } from 'lucide-react';
import '../../styles/Inventory.css';

const PurchaseOrderCreate = () => {
    const navigate = useNavigate();
    const [supplier, setSupplier] = useState('');
    const [items, setItems] = useState([{ product: '', type: 'Filled', quantity: '', unitPrice: '' }]);

    const handleAddItem = () => {
        setItems([...items, { product: '', type: 'Filled', quantity: '', unitPrice: '' }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice) || 0), 0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert('Purchase Order Created Successfully!');
    };

    return (
        <>
            <AdminSidebar />
            <div className="inventory-container">
                <main className="inventory-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Create Purchase Order</h1>
                            <p className="page-subtitle">Raise a new order to suppliers</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="form-card">
                        <div className="form-section">
                            <h3 className="section-title">Order Details</h3>
                            <div className="form-grid">
                                <div className="form-field">
                                    <label>Supplier</label>
                                    <input type="text" value="Laugfs Gas" readOnly style={{ backgroundColor: '#f5f5f5' }} />
                                </div>
                                <div className="form-field">
                                    <label>Expected Date*</label>
                                    <input type="date" required />
                                </div>
                            </div>
                        </div>

                        <div className="form-section">
                            <h3 className="section-title">Items</h3>
                            {items.map((item, index) => (
                                <div key={index} className="item-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
                                    <div className="form-field" style={{ flex: 1.5 }}>
                                        <label>Product</label>
                                        <select
                                            value={item.product}
                                            onChange={(e) => handleChange(index, 'product', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Weight</option>
                                            <option value="2kg">2kg</option>
                                            <option value="5kg">5kg</option>
                                            <option value="12.5kg">12.5kg</option>
                                            <option value="37.5kg">37.5kg</option>
                                        </select>
                                    </div>
                                    <div className="form-field" style={{ flex: 1 }}>
                                        <label>Type</label>
                                        <select
                                            value={item.type}
                                            onChange={(e) => handleChange(index, 'type', e.target.value)}
                                            required
                                        >
                                            <option value="Filled">Filled</option>
                                            <option value="New">New</option>
                                        </select>
                                    </div>
                                    <div className="form-field" style={{ flex: 1 }}>
                                        <label>Quantity</label>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleChange(index, 'quantity', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-field" style={{ flex: 1 }}>
                                        <label>Unit Price (Rs)</label>
                                        <input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => handleChange(index, 'unitPrice', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-field" style={{ flex: 1 }}>
                                        <label>Line Total (Rs)</label>
                                        <input
                                            type="text"
                                            value={(Number(item.quantity) * Number(item.unitPrice) || 0).toLocaleString()}
                                            disabled
                                            style={{ backgroundColor: '#f5f5f5', textAlign: 'right' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="btn btn-danger"
                                        style={{ marginBottom: '2px', padding: '10px' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddItem} className="btn btn-secondary" style={{ marginTop: '10px' }}>
                                + Add Item
                            </button>
                        </div>

                        <div className="form-footer" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="total-display">
                                <span style={{ fontSize: '18px', color: '#666' }}>Total Amount:</span>
                                <span style={{ fontSize: '24px', fontWeight: 'bold', marginLeft: '10px', color: '#333' }}>
                                    Rs. {calculateTotal().toLocaleString()}
                                </span>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/purchase-orders')}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={20} />
                                    Create Order
                                </button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default PurchaseOrderCreate;
