import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { productApi, purchaseOrderApi } from '../../services/api';
import '../../styles/Invoice.css';
import DateInput from '../../components/DateInput';


const PurchaseOrderCreate = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        expected_date: '',
        supplier_contact: '',
        items: []
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await productApi.getActiveProducts();
            setProducts(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch products:', error);
            alert('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                product_id: '',
                purchase_type: 'FILLED',
                quantity: 1,
                unit_price: 0
            }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index, field, value) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            newItems[index] = { ...newItems[index], [field]: value };

            // Auto-fill unit price when product is selected
            if (field === 'product_id' || field === 'purchase_type') {
                const product = products.find(p => p.product_id === (field === 'product_id' ? value : newItems[index].product_id));
                if (product) {
                    const purchaseType = field === 'purchase_type' ? value : newItems[index].purchase_type;
                    newItems[index].unit_price = purchaseType === 'FILLED'
                        ? product.filled_purchase_price
                        : product.new_purchase_price;
                }
            }

            return { ...prev, items: newItems };
        });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        if (!formData.expected_date) {
            alert('Please select expected delivery date');
            return;
        }

        // Validate items
        for (let i = 0; i < formData.items.length; i++) {
            const item = formData.items[i];
            if (!item.product_id) {
                alert(`Please select a product for item ${i + 1}`);
                return;
            }
            if (item.quantity <= 0) {
                alert(`Please enter a valid quantity for item ${i + 1}`);
                return;
            }
        }

        try {
            setSubmitting(true);
            const response = await purchaseOrderApi.create(formData);
            alert(`Purchase Order ${response.data.data.order_number} created successfully!`);
            navigate('/admin/purchase-orders');
        } catch (error) {
            console.error('Failed to create PO:', error);
            alert(error.response?.data?.message || 'Failed to create purchase order');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount);
    };

    if (loading) {
        return (
            <>
                <AdminSidebar />
                <div className="invoice-container">
                    <main className="invoice-main">
                        <div style={{ textAlign: 'center', padding: '100px' }}>
                            <Loader2 className="spinner" size={50} />
                            <p style={{ marginTop: '20px' }}>Loading...</p>
                        </div>
                    </main>
                </div>
            </>
        );
    }

    return (
        <>
            <AdminSidebar />
            <div className="invoice-container">
                <main className="invoice-main">
                    <div className="page-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/admin/purchase-orders')}
                                style={{ padding: '8px 12px' }}
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="page-title">Create Purchase Order</h1>
                                <p className="page-subtitle">Order cylinders from Laugfs Gas PLC</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="table-container" style={{ marginBottom: '20px' }}>
                            <div style={{ padding: '20px' }}>
                                <h3 style={{ marginBottom: '20px' }}>Order Details</h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                            Expected Delivery Date *
                                        </label>
                                        <DateInput
                                            required
                                            value={formData.expected_date}
                                            onChange={(value) => setFormData(prev => ({ ...prev, expected_date: value }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                            Supplier Contact (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.supplier_contact}
                                            onChange={(e) => setFormData(prev => ({ ...prev, supplier_contact: e.target.value }))}
                                            placeholder="e.g., 011-2345678"
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #ddd',
                                                fontSize: '14px'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="table-container" style={{ marginBottom: '20px' }}>
                            <div style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3>Order Items</h3>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={addItem}
                                    >
                                        <Plus size={18} />
                                        Add Item
                                    </button>
                                </div>

                                {formData.items.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '40px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '2px dashed #ddd'
                                    }}>
                                        <ShoppingCart size={48} style={{ color: '#ccc', marginBottom: '15px' }} />
                                        <p style={{ color: '#666' }}>No items added yet. Click "Add Item" to start.</p>
                                    </div>
                                ) : (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Purchase Type</th>
                                                <th>Quantity</th>
                                                <th>Unit Price (LKR)</th>
                                                <th>Total</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <select
                                                            value={item.product_id}
                                                            onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                                                            required
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #ddd'
                                                            }}
                                                        >
                                                            <option value="">Select Product</option>
                                                            {products.map(p => (
                                                                <option key={p.product_id} value={p.product_id}>
                                                                    {p.cylinder_size} ({p.product_code})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <select
                                                            value={item.purchase_type}
                                                            onChange={(e) => updateItem(index, 'purchase_type', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #ddd'
                                                            }}
                                                        >
                                                            <option value="FILLED">Refill (FILLED)</option>
                                                            <option value="NEW">New Cylinder</option>
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                            required
                                                            style={{
                                                                width: '80px',
                                                                padding: '8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #ddd',
                                                                textAlign: 'center'
                                                            }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                            required
                                                            style={{
                                                                width: '120px',
                                                                padding: '8px',
                                                                borderRadius: '6px',
                                                                border: '1px solid #ddd',
                                                                textAlign: 'right'
                                                            }}
                                                        />
                                                    </td>
                                                    <td style={{ fontWeight: '600' }}>
                                                        {formatCurrency(item.quantity * item.unit_price)}
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            style={{
                                                                padding: '6px 10px',
                                                                backgroundColor: '#fee2e2',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                color: '#dc2626'
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="4" style={{ textAlign: 'right', fontWeight: '600', fontSize: '16px' }}>
                                                    Grand Total:
                                                </td>
                                                <td colSpan="2" style={{ fontWeight: '700', fontSize: '18px', color: '#059669' }}>
                                                    {formatCurrency(calculateTotal())}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/admin/purchase-orders')}
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || formData.items.length === 0}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="spinner" size={18} />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        Create Purchase Order
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default PurchaseOrderCreate;