import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, DollarSign, Edit2, Loader2, AlertTriangle, Download, Package, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import api, { productApi } from '../../services/api';
import '../../styles/Inventory.css';

const AdminInventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryData, setInventoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPriceUpdate, setShowPriceUpdate] = useState(false);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [damageSubmitting, setDamageSubmitting] = useState(false);

    // View Products modal
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    // Damage form state
    const [damageProductId, setDamageProductId] = useState('');
    const [damageQuantity, setDamageQuantity] = useState('');
    const [damageReason, setDamageReason] = useState('');

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

    const handleDamageReport = async (e) => {
        e.preventDefault();

        if (!damageProductId || !damageQuantity || !damageReason) {
            alert('Please fill in all fields');
            return;
        }

        try {
            setDamageSubmitting(true);
            await api.post('/products/damage', {
                product_id: damageProductId,
                quantity_damaged: parseInt(damageQuantity),
                damage_reason: damageReason
            });

            alert('Damage reported successfully!');
            setShowDamageModal(false);
            setDamageProductId('');
            setDamageQuantity('');
            setDamageReason('');
            fetchInventory(); // Refresh inventory table
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to report damage';
            alert(msg);
        } finally {
            setDamageSubmitting(false);
        }
    };

    const openDamageModal = () => {
        setDamageProductId('');
        setDamageQuantity('');
        setDamageReason('');
        setShowDamageModal(true);
    };

    const handleExportExcel = async () => {
        try {
            const response = await api.get('/products/export', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to export inventory');
            console.error(err);
        }
    };

    // Fetch all products for the View Products modal
    const fetchAllProducts = async () => {
        setProductsLoading(true);
        try {
            const response = await api.get('/products');
            setAllProducts(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch products', err);
            alert('Failed to load products');
        } finally {
            setProductsLoading(false);
        }
    };

    const handleViewProducts = () => {
        fetchAllProducts();
        setShowProductsModal(true);
    };

    const handleToggleProductStatus = async (product) => {
        const action = product.status === 'ACTIVE' ? 'deactivate' : 'activate';
        if (!window.confirm(`Are you sure you want to ${action} this product?`)) return;

        setTogglingId(product.product_id);
        try {
            await productApi.toggleProductStatus(product.product_id);
            // Refresh the products list
            await fetchAllProducts();
            // Also refresh inventory in case status changed
            fetchInventory();
        } catch (err) {
            console.error('Failed to toggle product status:', err);
            alert(err.response?.data?.message || 'Failed to update product status');
        } finally {
            setTogglingId(null);
        }
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
                            <button
                                className="btn"
                                style={{
                                    backgroundColor: '#101540',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                                onClick={handleViewProducts}
                            >
                                <Eye size={18} />
                                View Products
                            </button>
                            <button
                                className="btn"
                                style={{
                                    backgroundColor: '#101540',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontWeight: '600',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                                onClick={handleExportExcel}
                            >
                                <Download size={18} />
                                Export Excel
                            </button>
                        </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/admin/inventory/add')}>
                            <Plus size={20} />
                            Add Product
                        </button>
                        <button className="btn btn-secondary" onClick={() => setShowPriceUpdate(true)}>
                            <DollarSign size={20} />
                            Update Prices
                        </button>
                        <button className="btn btn-danger" style={{ backgroundColor: '#dc3545', color: 'white' }} onClick={openDamageModal}>
                            <AlertTriangle size={20} />
                            Report Damage
                        </button>
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
                                    <th>Total Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                            <Loader2 className="spinner" size={30} style={{ margin: '0 auto' }} />
                                            <p style={{ marginTop: '10px' }}>Loading inventory...</p>
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                            No products found in inventory.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: '600' }}>{item.cylinder_size}</td>
                                            <td>{item.filled || 0}</td>
                                            <td>{item.empty || 0}</td>
                                            <td style={{ color: '#dc3545' }}>{item.damaged || 0}</td>
                                            <td style={{ fontWeight: 'bold' }}>
                                                {(item.filled || 0) + (item.empty || 0) + (item.damaged || 0)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* View Products Modal */}
                {showProductsModal && (
                    <div className="modal-overlay" onClick={() => setShowProductsModal(false)}>
                        <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">All Products</h2>
                                <button className="modal-close" onClick={() => setShowProductsModal(false)}>×</button>
                            </div>
                            <div className="modal-body" style={{ padding: '20px' }}>
                                {productsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '30px' }}>
                                        <Loader2 className="spinner" size={30} style={{ margin: '0 auto' }} />
                                        <p style={{ marginTop: '10px' }}>Loading products...</p>
                                    </div>
                                ) : allProducts.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No products found</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {allProducts.map((product) => (
                                            <div
                                                key={product.product_id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '14px 18px',
                                                    backgroundColor: '#f9f9f9',
                                                    borderRadius: '12px',
                                                    border: '1px solid #eee',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                    <span style={{ fontWeight: '600', color: '#101540', fontSize: '14px' }}>
                                                        {product.product_code}
                                                    </span>
                                                    <span style={{ color: '#555', fontSize: '14px' }}>
                                                        {product.cylinder_size}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span
                                                        className={`badge ${product.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                                                        style={{ fontSize: '11px', padding: '4px 10px' }}
                                                    >
                                                        {product.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                                                    </span>
                                                    <button
                                                        onClick={() => handleToggleProductStatus(product)}
                                                        disabled={togglingId === product.product_id}
                                                        style={{
                                                            backgroundColor: product.status === 'ACTIVE' ? '#dc3545' : '#28a745',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 14px',
                                                            borderRadius: '8px',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            cursor: togglingId === product.product_id ? 'wait' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            opacity: togglingId === product.product_id ? 0.6 : 1,
                                                            minWidth: '90px',
                                                            justifyContent: 'center'
                                                        }}
                                                        title={product.status === 'ACTIVE' ? 'Deactivate this product' : 'Activate this product'}
                                                    >
                                                        {togglingId === product.product_id ? (
                                                            'Updating...'
                                                        ) : product.status === 'ACTIVE' ? (
                                                            <>
                                                                <ToggleRight size={14} />
                                                                Deactivate
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ToggleLeft size={14} />
                                                                Activate
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                                <button
                                    className="btn"
                                    style={{
                                        backgroundColor: '#101540',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 50px',
                                        borderRadius: '10px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setShowProductsModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                                            <select
                                                required
                                                value={damageProductId}
                                                onChange={(e) => setDamageProductId(e.target.value)}
                                            >
                                                <option value="">Select Size...</option>
                                                {inventoryData.map((item, idx) => (
                                                    <option key={idx} value={item.product_id}>
                                                        {item.cylinder_size} (Filled: {item.filled || 0})
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
                                                value={damageQuantity}
                                                onChange={(e) => setDamageQuantity(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Reason / Notes</label>
                                            <textarea
                                                required
                                                placeholder="Describe the damage..."
                                                rows="3"
                                                value={damageReason}
                                                onChange={(e) => setDamageReason(e.target.value)}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDamageModal(false)}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn btn-danger"
                                        style={{ backgroundColor: '#dc3545', color: 'white' }}
                                        disabled={damageSubmitting}
                                    >
                                        {damageSubmitting ? 'Submitting...' : 'Submit Report'}
                                    </button>
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
