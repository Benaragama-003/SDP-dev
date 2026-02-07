import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, DollarSign, Edit2, Loader2, AlertTriangle, Download, Filter } from 'lucide-react';
import { productApi } from '../../services/api';
import '../../styles/Inventory.css';


const AdminInventory = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [inventoryData, setInventoryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPriceUpdate, setShowPriceUpdate] = useState(false);
    const [showDamageModal, setShowDamageModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFilters, setExportFilters] = useState({ start_date: '', end_date: '' });
    const [products, setProducts] = useState([]); // For dropdown (has product_id)
    const [selectedProduct, setSelectedProduct] = useState('');
    const [priceForm, setPriceForm] = useState({
        filled_selling_price: '',
        new_selling_price: ''
    });
    const [damageForm, setDamageForm] = useState({
        product_id: '',
        quantity_damaged: '',
        damage_reason: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [showProductsModal, setShowProductsModal] = useState(false);
    const [expandedProduct, setExpandedProduct] = useState(null);
    const navigate = useNavigate();

    const fetchInventory = async () => {
    try {
        setLoading(true);
        const [invResponse, prodResponse] = await Promise.all([
            productApi.getInventorySummary(),
            productApi.getAllProducts()
        ]);
        setInventoryData(invResponse.data.data);
        setProducts(prodResponse.data.data);
    } catch (err) {
        console.error("Failed to fetch inventory", err);
        setInventoryData([]);
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

const handlePriceUpdate = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
        alert('Please select a product');
        return;
    }
    try {
        setSubmitting(true);
        const resp = await productApi.updateProduct(selectedProduct, {
            filled_purchase_price: priceForm.filled_purchase_price || undefined,
            filled_selling_price: priceForm.filled_selling_price || undefined,
            new_purchase_price: priceForm.new_purchase_price || undefined,
            new_selling_price: priceForm.new_selling_price || undefined
        });
        alert(resp.data?.message || 'Prices updated successfully!');
        setShowPriceUpdate(false);
        setPriceForm({ filled_selling_price: '', new_selling_price: '' });
        setSelectedProduct('');
        fetchInventory();
    } catch (err) {
        console.error('Failed to update prices', err);
        alert('Failed to update prices: ' + (err.response?.data?.message || err.message));
    } finally {
        setSubmitting(false);
    }
};

const handleDamageReport = async (e) => {
    e.preventDefault();
    if (!damageForm.product_id || !damageForm.quantity_damaged || !damageForm.damage_reason) {
        alert('Please fill all fields');
        return;
    }
    try {
        setSubmitting(true);
        await productApi.reportDamage({
            product_id: damageForm.product_id,
            quantity_damaged: parseInt(damageForm.quantity_damaged),
            damage_reason: damageForm.damage_reason
        });
        alert('Damage reported successfully!');
        setShowDamageModal(false);
        setDamageForm({ product_id: '', quantity_damaged: '', damage_reason: '' });
        fetchInventory();
    } catch (err) {
        console.error('Failed to report damage', err);
        alert('Failed to report damage: ' + (err.response?.data?.message || err.message));
    } finally {
        setSubmitting(false);
    }
};

const handleToggleProductStatus = async (productId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus === 'ACTIVE' ? 'deactivate' : 'activate'} this product?`)) {
        return;
    }
    try {
        await productApi.toggleProductStatus(productId);
        fetchInventory();
    } catch (err) {
        console.error('Failed to toggle status', err);
        alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    }
};

const handleExport = async () => {
    try {
        // note: backend expects start_date / end_date (not from/to)
        const params = {};
        if (exportFilters.start_date) params.start_date = exportFilters.start_date;
        if (exportFilters.end_date) params.end_date = exportFilters.end_date;
        
        const response = await productApi.exportToExcel(params);
        const blob = new Blob([response.data], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setShowExportModal(false);
        setExportFilters({ start_date: '', end_date: '' });
    } catch (err) {
        console.error('Failed to export', err);
        // if server returned JSON error, parse it and show message
        let msg = 'Failed to export inventory report';
        if (err.response?.data) {
            try {
                // axios may return JSON error even for non-200
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const json = JSON.parse(reader.result);
                        alert(json.message || msg);
                    } catch {
                        alert(msg);
                    }
                };
                reader.readAsText(err.response.data);
            } catch {
                alert(msg);
            }
        } else {
            alert(msg);
        }
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
                            <button className="btn btn-secondary" onClick={() => setShowProductsModal(true)}>
                                View Products
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
                                <Download size={20} />
                                Export Excel
                            </button>
                        </div>
                    </div>
                                            
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>

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
                                        <tr key={index} style={{ opacity: item.status === 'DISCONTINUED' ? 0.6 : 1 }}>
                                            <td style={{ fontWeight: '600' }}>
                                                {item.cylinder_size}
                                                {item.status === 'DISCONTINUED' && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        padding: '2px 6px',
                                                        fontSize: '10px',
                                                        backgroundColor: '#6c757d',
                                                        color: 'white',
                                                        borderRadius: '4px'
                                                    }}>INACTIVE</span>
                                                )}
                                            </td>
                                            <td>{item.filled}</td>
                                            <td>{item.empty}</td>
                                            <td style={{ color: '#dc3545' }}>{item.damaged}</td>
                                       
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

                {/* Price Update Modal */}
                {showPriceUpdate && (
                    <div className="modal-overlay" onClick={() => setShowPriceUpdate(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Update Selling Prices</h2>
                                <button className="modal-close" onClick={() => setShowPriceUpdate(false)}>×</button>
                            </div>
                            <form onSubmit={handlePriceUpdate}>
                                <div className="modal-body">
                                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                            <label>Select Product</label>
                                            <select 
                                                required
                                                value={selectedProduct}
                                                onChange={(e) => setSelectedProduct(e.target.value)}
                                            >
                                                <option value="">Select product...</option>
                                                {products.map((p) => (
                                                    <option key={p.product_id} value={p.product_id}>
                                                        {p.cylinder_size} ({p.product_code})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-field">
                                            <label>Filled Purchasing Price (Rs)</label>
                                            <input 
                                                type="number" 
                                                placeholder="New price" 
                                                value={priceForm.filled_purchase_price}
                                                onChange={(e) => setPriceForm({...priceForm, filled_purchase_price: e.target.value})}
                                            />
                                        </div>                                       
                                        <div className="form-field">
                                            <label>Filled Selling Price (Rs)</label>
                                            <input 
                                                type="number" 
                                                placeholder="New price" 
                                                value={priceForm.filled_selling_price}
                                                onChange={(e) => setPriceForm({...priceForm, filled_selling_price: e.target.value})}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>New Purchasing Price (Rs)</label>
                                            <input 
                                                type="number" 
                                                placeholder="New price" 
                                                value={priceForm.new_purchase_price}
                                                onChange={(e) => setPriceForm({...priceForm, new_purchase_price: e.target.value})}
                                            />
                                        </div>                                        
                                        <div className="form-field">
                                            <label>New Selling Price (Rs)</label>
                                            <input 
                                                type="number" 
                                                placeholder="New price" 
                                                value={priceForm.new_selling_price}
                                                onChange={(e) => setPriceForm({...priceForm, new_selling_price: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-danger" onClick={() => setShowPriceUpdate(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Updating...' : 'Update Prices'}
                                    </button>
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
                                <h2 className="modal-title">Report Warehouse Damage</h2>
                                <button className="modal-close" onClick={() => setShowDamageModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleDamageReport}>
                                <div className="modal-body">
                                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                                        <div className="form-field">
                                            <label>Product (Cylinder Size)</label>
                                            <select 
                                                required
                                                value={damageForm.product_id}
                                                onChange={(e) => setDamageForm({...damageForm, product_id: e.target.value})}
                                            >
                                                <option value="">Select product...</option>
                                                {products.map((p) => (
                                                    <option key={p.product_id} value={p.product_id}>
                                                        {p.cylinder_size} ({p.product_code})
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
                                                value={damageForm.quantity_damaged}
                                                onChange={(e) => setDamageForm({...damageForm, quantity_damaged: e.target.value})}
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Damage Reason</label>
                                            <textarea 
                                                required 
                                                placeholder="Describe the damage..." 
                                                rows="3"
                                                value={damageForm.damage_reason}
                                                onChange={(e) => setDamageForm({...damageForm, damage_reason: e.target.value})}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDamageModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-danger" style={{ backgroundColor: '#dc3545', color: 'white' }} disabled={submitting}>
                                        {submitting ? 'Submitting...' : 'Submit Report'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Products List Modal */}
                {showProductsModal && (
                    <div className="modal-overlay" onClick={() => setShowProductsModal(false)}>
                        <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">All Products</h2>
                                <button className="modal-close" onClick={() => setShowProductsModal(false)}>×</button>
                            </div>
                            <div className="modal-body" style={{ maxHeight: '500px', overflowY: 'auto', padding: '0' }}>
                                {products.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                        No products added yet. Click "Add Product" to create one.
                                    </div>
                                ) : (
                                    products.map((p) => (
                                        <div key={p.product_id} style={{ borderBottom: '1px solid #eee' }}>
                                            <div 
                                                style={{ 
                                                    display: 'grid',
                                                    gridTemplateColumns: '100px 80px 70px 1fr',
                                                    alignItems: 'center', 
                                                    padding: '15px 20px',
                                                    gap: '15px',
                                                    backgroundColor: expandedProduct === p.product_id ? '#f8f9fa' : 'white'
                                                }}
                                            >
                                                <span style={{ fontWeight: '600', color: '#6B21A8' }}>{p.product_code}</span>
                                                <span>{p.cylinder_size}</span>
                                                <span 
                                                    onClick={() => handleToggleProductStatus(p.product_id, p.status)}
                                                    style={{ 
                                                        padding: '4px 10px', 
                                                        borderRadius: '12px', 
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                        backgroundColor: p.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                                                        color: p.status === 'ACTIVE' ? '#16a34a' : '#dc2626',
                                                        textAlign: 'center'
                                                    }}
                                                    title="Click to toggle status"
                                                >
                                                    {p.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        style={{ padding: '5px 12px', fontSize: '12px' }}
                                                        onClick={() => setExpandedProduct(expandedProduct === p.product_id ? null : p.product_id)}
                                                    >
                                                        {expandedProduct === p.product_id ? 'Hide' : 'View'}
                                                    </button>
                                                </div>
                                            </div>
                                            {expandedProduct === p.product_id && (
                                                <div style={{ padding: '15px 20px', backgroundColor: '#f8f9fa' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                        <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#6B21A8' }}>Supplier Prices (Purchase)</h4>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                <span style={{ color: '#666', fontSize: '13px' }}>Filled:</span>
                                                                <span style={{ fontWeight: '600' }}>Rs. {parseFloat(p.filled_purchase_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: '#666', fontSize: '13px' }}>New:</span>
                                                                <span style={{ fontWeight: '600' }}>Rs. {parseFloat(p.new_purchase_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '15px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#16a34a' }}>Dealer Prices (Selling)</h4>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                <span style={{ color: '#666', fontSize: '13px' }}>Filled:</span>
                                                                <span style={{ fontWeight: '600' }}>Rs. {parseFloat(p.filled_selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: '#666', fontSize: '13px' }}>New:</span>
                                                                <span style={{ fontWeight: '600' }}>Rs. {parseFloat(p.new_selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="modal-footer" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
                                <button className="btn btn-secondary" onClick={() => setShowProductsModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Export Filter Modal */}
                {showExportModal && (
                    <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
                        <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Export Inventory Report</h2>
                                <button className="modal-close" onClick={() => setShowExportModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: '#666', marginBottom: '20px' }}>Export current inventory and stock movements to Excel.</p>
                                <div className="form-field" style={{ marginBottom: '15px' }}>
                                    <label>Start Date (optional)</label>
                                    <input
                                        type="date"
                                        value={exportFilters.start_date}
                                        onChange={e => setExportFilters(f => ({ ...f, start_date: e.target.value }))}
                                    />
                                </div>
                                <div className="form-field" style={{ marginBottom: '15px' }}>
                                    <label>End Date (optional)</label>
                                    <input
                                        type="date"
                                        value={exportFilters.end_date}
                                        onChange={e => setExportFilters(f => ({ ...f, end_date: e.target.value }))}
                                    />
                                </div>
                                <div style={{ padding: '12px', backgroundColor: '#fef9c3', borderRadius: '8px', fontSize: '13px' }}>
                                    <strong style={{ color: '#b45309' }}>Note:</strong> The exported Excel will have 2 sheets:
                                    <ul style={{ margin: '5px 0 0 15px', color: '#92400e' }}>
                                        <li>Current Inventory (all products)</li>
                                        <li>Stock Movements (grouped by product)</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee' }}>
                                <button className="btn btn-danger" onClick={() => setShowExportModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleExport}>
                                    <Download size={18} /> Export Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminInventory;
