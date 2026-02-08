import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Save, Plus, Loader2, AlertCircle, Truck } from 'lucide-react';
import DateInput from '../components/DateInput';
import { dealerApi, dispatchApi, invoiceApi } from '../services/api';
import '../styles/Invoice.css';

const InvoiceCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const [searchTerm, setSearchTerm] = useState('');
    const [showDealerDropdown, setShowDealerDropdown] = useState(false);
    const [dealers, setDealers] = useState([]);
    const [loadingDealers, setLoadingDealers] = useState(true);
    const [activeDispatch, setActiveDispatch] = useState(null);
    const [loadingDispatch, setLoadingDispatch] = useState(true);
    const [lorryStock, setLorryStock] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [paidAmount, setPaidAmount] = useState('');

    // Fetch active dispatch and dealers on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active dispatch for this supervisor
                const dispatchRes = await dispatchApi.getMyDispatch();
                const dispatch = dispatchRes.data.data;
                setActiveDispatch(dispatch);
                
                if (dispatch && dispatch.items) {
                    // Set lorry stock from dispatch items (only items with available balance)
                    setLorryStock(dispatch.items.filter(item => {
                        const balance = item.balance_quantity ?? (item.loaded_quantity - (item.sold_filled || 0) - (item.sold_new || 0) - (item.damaged_quantity || 0));
                        return balance > 0;
                    }));
                }
            } catch (err) {
                console.error('Error fetching dispatch:', err);
            } finally {
                setLoadingDispatch(false);
            }
            
            // Fetch active dealers
            try {
                const dealerRes = await dealerApi.getActiveDealers();
                setDealers(dealerRes.data.data || []);
            } catch (err) {
                console.error('Error fetching dealers:', err);
            } finally {
                setLoadingDealers(false);
            }
        };
        fetchData();
    }, []);

    const [invoiceItems, setInvoiceItems] = useState([]);

    const [invoiceData, setInvoiceData] = useState({
        dealerId: '',
        dealer: '',
        route: '',
        telephone: '',
        date: today,
        paymentType: 'cash',
        paidAmount: '',
        chequeNo: '',
        chequeDate: '',
        chequeAmount: '',
        bankName: '',
        branchName: ''
    });

    const handleInputChange = (e) => {
        setInvoiceData({
            ...invoiceData,
            [e.target.name]: e.target.value
        });
    };

    const handleDealerSelect = (dealer) => {
        setInvoiceData({
            ...invoiceData,
            dealer: dealer.dealer_name,
            dealerId: dealer.dealer_id,
            route: dealer.route || '',
            telephone: dealer.contact_number || ''
        });
        setSearchTerm(dealer.dealer_name);
        setShowDealerDropdown(false);
    };

    const filteredDealers = dealers.filter(d =>
        d.dealer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.dealer_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate how much of a product is already used in other invoice rows (excluding current index)
    const getUsedQuantity = (productId, excludeIndex = -1) => {
        return invoiceItems.reduce((sum, item, idx) => {
            if (idx !== excludeIndex && item.product_id === productId) {
                return sum + (parseInt(item.quantity) || 0);
            }
            return sum;
        }, 0);
    };

    // Get available quantity for a product (original balance minus what's used in other rows)
    const getAvailableForProduct = (productId, excludeIndex = -1) => {
        const stockItem = lorryStock.find(s => s.product_id === productId);
        if (!stockItem) return 0;
        const balance = stockItem.balance_quantity ?? (stockItem.loaded_quantity - (stockItem.sold_filled || 0) - (stockItem.sold_new || 0) - (stockItem.damaged_quantity || 0));
        const used = getUsedQuantity(productId, excludeIndex);
        return balance - used;
    };

    const addInvoiceItem = () => {
        if (lorryStock.length === 0) {
            alert('No stock available in lorry');
            return;
        }
        setInvoiceItems([...invoiceItems, { 
            product_id: '', 
            sale_type: 'FILLED', 
            quantity: 1,
            unit_price: 0,
            available: 0
        }]);
    };

    const updateInvoiceItem = (index, field, value) => {
        const newItems = [...invoiceItems];
        newItems[index][field] = value;
        
        // When product changes, update price and available qty
        if (field === 'product_id' && value) {
            const stockItem = lorryStock.find(s => s.product_id === value);
            if (stockItem) {
                const availableForThis = getAvailableForProduct(value, index);
                newItems[index].available = availableForThis;
                newItems[index].unit_price = stockItem.filled_selling_price || 0;
                newItems[index].size = stockItem.size;
                // Reset quantity to 1 or max available
                newItems[index].quantity = Math.min(1, availableForThis);
            }
        }
        
        // When sale_type changes, update price
        if (field === 'sale_type') {
            const stockItem = lorryStock.find(s => s.product_id === newItems[index].product_id);
            if (stockItem) {
                newItems[index].unit_price = value === 'NEW' 
                    ? (stockItem.new_selling_price || 0) 
                    : (stockItem.filled_selling_price || 0);
            }
        }

        // When quantity changes, validate against available
        if (field === 'quantity' && newItems[index].product_id) {
            const availableForThis = getAvailableForProduct(newItems[index].product_id, index);
            const qty = parseInt(value) || 0;
            if (qty > availableForThis) {
                alert(`Only ${availableForThis} available for this product (${newItems[index].size})`);
                newItems[index].quantity = availableForThis;
            }
            // Update available display for this row
            newItems[index].available = availableForThis;
        }
        
        setInvoiceItems(newItems);
    };

    const removeInvoiceItem = (index) => {
        setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    };

    const getTotalAmount = () => {
        return invoiceItems.reduce((sum, item) => {
            const lineTotal = Math.round(parseFloat(item.unit_price) * parseInt(item.quantity || 0) * 100) / 100;
            return Math.round((sum + lineTotal) * 100) / 100;
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!activeDispatch) {
            alert('No active dispatch found. Start a dispatch first.');
            return;
        }
        
        if (!invoiceData.dealerId) {
            alert('Please select a dealer');
            return;
        }
        
        if (invoiceItems.length === 0) {
            alert('Please add at least one product');
            return;
        }
        
        // Validate quantities - check total used per product doesn't exceed balance
        const productTotals = {};
        for (const item of invoiceItems) {
            if (!item.product_id) {
                alert('Please select a product for all items');
                return;
            }
            productTotals[item.product_id] = (productTotals[item.product_id] || 0) + (parseInt(item.quantity) || 0);
        }
        
        for (const [productId, totalQty] of Object.entries(productTotals)) {
            const stockItem = lorryStock.find(s => s.product_id === productId);
            if (stockItem) {
                const balance = stockItem.balance_quantity ?? (stockItem.loaded_quantity - (stockItem.sold_filled || 0) - (stockItem.sold_new || 0) - (stockItem.damaged_quantity || 0));
                if (totalQty > balance) {
                    alert(`Total quantity for ${stockItem.size} (${totalQty}) exceeds available stock (${balance})`);
                    return;
                }
            }
        }
        
        setSubmitting(true);
        try {
            const payload = {
                dealer_id: invoiceData.dealerId,
                dispatch_id: activeDispatch.dispatch_id,
                items: invoiceItems.map(item => ({
                    product_id: item.product_id,
                    sale_type: item.sale_type,
                    quantity: parseInt(item.quantity),
                    unit_price: parseFloat(item.unit_price)
                })),
                payment_method: invoiceData.paymentType.toUpperCase(),
                paid_amount: invoiceData.paymentType === 'cash' 
                    ? Math.round(parseFloat(paidAmount) * 100) / 100 || 0 
                    : invoiceData.paymentType === 'cheque' 
                        ? Math.round(parseFloat(invoiceData.chequeAmount) * 100) / 100 || 0 
                        : null,
                cheque_details: invoiceData.paymentType === 'cheque' ? {
                    number: invoiceData.chequeNo,
                    date: invoiceData.chequeDate,
                    amount: parseFloat(invoiceData.chequeAmount),
                    bank: invoiceData.bankName,
                    branch: invoiceData.branchName
                } : null
            };
            
            const response = await invoiceApi.create(payload);
            alert(`Invoice created successfully! Invoice : ${response.data.data.invoice_number}`);
            
            // Reset form
            setInvoiceItems([]);
            setSearchTerm('');
            setPaidAmount('');
            setInvoiceData({
                dealerId: '',
                dealer: '',
                route: '',
                telephone: '',
                date: today,
                paymentType: 'cash',
                paidAmount: '',
                chequeNo: '',
                chequeDate: '',
                chequeAmount: '',
                bankName: '',
                branchName: ''
            });
            
            // Refresh dispatch data to get updated stock
            const dispatchRes = await dispatchApi.getMyDispatch();
            const dispatch = dispatchRes.data.data;
            setActiveDispatch(dispatch);
            if (dispatch && dispatch.items) {
                setLorryStock(dispatch.items.filter(item => {
                    const balance = item.balance_quantity ?? (item.loaded_quantity - (item.sold_filled || 0) - (item.sold_new || 0) - (item.damaged_quantity || 0));
                    return balance > 0;
                }));
            }
        } catch (error) {
            console.error('Failed to create invoice:', error);
            alert(error.response?.data?.message || 'Failed to create invoice');
        } finally {
            setSubmitting(false);
        }
    };

    // Show loading state
    if (loadingDispatch) {
        return (
            <>
                <Sidebar />
                <div className="invoice-container">
                    <main className="invoice-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
                    </main>
                </div>
            </>
        );
    }

    // Check if invoice creation is allowed
    const canCreateInvoice = activeDispatch && activeDispatch.status === 'IN_PROGRESS';

    return (
        <>
            <Sidebar />
            <div className="invoice-container">
                <main className="invoice-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Create Invoice</h1>
                            <p className="page-subtitle">Issue a new invoice for a dealer</p>
                        </div>
                    </div>

                    {/* Warning if no active dispatch or not in progress */}
                    {!canCreateInvoice && (
                        <div style={{ 
                            backgroundColor: '#fff3cd', 
                            padding: '15px 20px', 
                            borderRadius: '12px', 
                            marginBottom: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            border: '1px solid #ffc107'
                        }}>
                            <AlertCircle size={24} color="#856404" />
                            <div>
                                <div style={{ fontWeight: '600', color: '#856404' }}>
                                    {!activeDispatch ? 'No Active Dispatch' : `Dispatch Status: ${activeDispatch.status}`}
                                </div>
                                <div style={{ fontSize: '13px', color: '#856404' }}>
                                    {!activeDispatch 
                                        ? 'Start your assigned dispatch to create invoices.' 
                                        : 'Dispatch must be IN_PROGRESS to create invoices.'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Dispatch Info */}
                    {activeDispatch && (
                    <div style={{ 
                        backgroundColor: canCreateInvoice ? '#e8f5e9' : '#f5f5f5', 
                        padding: '15px 20px', 
                        borderRadius: '12px', 
                        marginBottom: '25px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        border: `1px solid ${canCreateInvoice ? '#a5d6a7' : '#ddd'}`
                    }}>
                        <Truck size={24} color={canCreateInvoice ? '#388e3c' : '#999'} />
                        <div>
                            <div style={{ fontWeight: '600', color: canCreateInvoice ? '#2e7d32' : '#666' }}>Dispatch: {activeDispatch.dispatch_number}</div>
                            <div style={{ fontSize: '13px', color: canCreateInvoice ? '#388e3c' : '#999' }}>
                                Lorry: {activeDispatch.plate_number} • Route: {activeDispatch.route} • Status: {activeDispatch.status}
                            </div>
                        </div>
                    </div>
                    )}

                    <form onSubmit={handleSubmit} className="invoice-form">
                        {/* Header Information */}
                        <div className="form-section">
                            <h3 className="section-title">Invoice Details</h3>
                            <div className="form-grid">
                                <div className="form-field" style={{ position: 'relative' }}>
                                    <label>Dealer*</label>
                                    <input
                                        type="text"
                                        placeholder="Search dealer..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowDealerDropdown(true);
                                        }}
                                        onFocus={() => setShowDealerDropdown(true)}
                                        required
                                    />
                                    {showDealerDropdown && searchTerm && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                            {loadingDealers ? (
                                                <div style={{ padding: '10px 15px', textAlign: 'center' }}>
                                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                                </div>
                                            ) : filteredDealers.map(dealer => (
                                                <div
                                                    key={dealer.dealer_id}
                                                    onClick={() => handleDealerSelect(dealer)}
                                                    style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                                >
                                                    <strong>{dealer.dealer_name}</strong> <span style={{ fontSize: '12px', color: '#666' }}></span>
                                                </div>
                                            ))}
                                            {!loadingDealers && filteredDealers.length === 0 && (
                                                <div style={{ padding: '10px 15px', color: '#999' }}>No active dealers found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="form-field">
                                    <label>Route</label>
                                    <input
                                        type="text"
                                        name="route"
                                        value={invoiceData.route}
                                        readOnly
                                        style={{ backgroundColor: '#f9f9f9' }}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Telephone</label>
                                    <input
                                        type="tel"
                                        name="telephone"
                                        value={invoiceData.telephone}
                                        readOnly
                                        style={{ backgroundColor: '#f9f9f9' }}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Date*</label>
                                    <DateInput
                                        value={invoiceData.date}
                                        onChange={(value) => setInvoiceData({ ...invoiceData, date: value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items Grid */}
                        <div className="allocation-section" style={{ marginTop: '30px', padding: '25px', backgroundColor: '#fdfdfd', borderRadius: '20px', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 className="section-title" style={{ fontSize: '18px', margin: 0 }}>Products</h3>
                                <button
                                    type="button"
                                    onClick={addInvoiceItem}
                                    disabled={lorryStock.length === 0}
                                    style={{ 
                                        backgroundColor: lorryStock.length === 0 ? '#ccc' : '#101540', 
                                        color: 'white', 
                                        border: 'none', 
                                        padding: '8px 15px', 
                                        borderRadius: '8px', 
                                        fontSize: '12px', 
                                        cursor: lorryStock.length === 0 ? 'not-allowed' : 'pointer', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '5px' 
                                    }}
                                >
                                    <Plus size={14} /> Add Product
                                </button>
                            </div>

                            {lorryStock.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#dc3545', padding: '20px', fontSize: '14px', border: '1px dashed #dc3545', borderRadius: '10px', backgroundColor: '#fff5f5' }}>
                                    No stock available in lorry. All products have been sold or damaged.
                                </p>
                            ) : (
                                <>
                                    {/* Available Stock Summary */}
                                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f4ff', borderRadius: '10px' }}>
                                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>Available Stock:</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                            {lorryStock.map(item => {
                                                const remaining = getAvailableForProduct(item.product_id);
                                                return (
                                                    <span key={item.product_id} style={{ 
                                                        padding: '5px 12px', 
                                                        backgroundColor: remaining === 0 ? '#ffebee' : '#fff', 
                                                        borderRadius: '20px', 
                                                        fontSize: '13px',
                                                        border: remaining === 0 ? '1px solid #f44336' : '1px solid #ddd',
                                                        color: remaining === 0 ? '#c62828' : 'inherit'
                                                    }}>
                                                        {item.size}: <strong>{remaining}</strong>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="allocation-list">
                                        {invoiceItems.length === 0 && (
                                            <p style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '14px', border: '1px dashed #ddd', borderRadius: '10px' }}>
                                                No products added yet. Click "Add Product" to start.
                                            </p>
                                        )}
                                        {invoiceItems.map((item, index) => (
                                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 40px', gap: '15px', marginBottom: '12px', alignItems: 'center' }}>
                                                <select
                                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                    value={item.product_id}
                                                    onChange={(e) => updateInvoiceItem(index, 'product_id', e.target.value)}
                                                    required
                                                >
                                                    <option value="">Select Product</option>
                                                    {lorryStock.map(stock => {
                                                        const remaining = getAvailableForProduct(stock.product_id, index);
                                                        return (
                                                            <option key={stock.product_id} value={stock.product_id} disabled={remaining <= 0 && item.product_id !== stock.product_id}>
                                                                {stock.size} ({remaining} available)
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                <select
                                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                    value={item.sale_type}
                                                    onChange={(e) => updateInvoiceItem(index, 'sale_type', e.target.value)}
                                                    required
                                                >
                                                    <option value="FILLED">Refill</option>
                                                    <option value="NEW">New Cylinder</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    placeholder="Qty"
                                                    min="1"
                                                    max={item.available}
                                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                                    value={item.quantity}
                                                    onChange={(e) => updateInvoiceItem(index, 'quantity', e.target.value)}
                                                    required
                                                />
                                                <div style={{ textAlign: 'right', fontWeight: '600', color: '#101540' }}>
                                                    Rs. {Math.round(item.unit_price * (item.quantity || 0)).toLocaleString()}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeInvoiceItem(index)}
                                                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Payment Section */}
                        <div className="form-section" style={{ marginTop: '30px' }}>
                            <h3 className="section-title">Payment Details</h3>
                            <div className="payment-types">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="cash"
                                        checked={invoiceData.paymentType === 'cash'}
                                        onChange={handleInputChange}
                                    />
                                    <span>Cash</span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="cheque"
                                        checked={invoiceData.paymentType === 'cheque'}
                                        onChange={handleInputChange}
                                    />
                                    <span>Cheque</span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="credit"
                                        checked={invoiceData.paymentType === 'credit'}
                                        onChange={handleInputChange}
                                    />
                                    <span>Credit</span>
                                </label>
                            </div>

                            {invoiceData.paymentType === 'cheque' && (
                                <div className="cheque-details" style={{ marginTop: '20px' }}>
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>Cheque No.*</label>
                                            <input
                                                type="text"
                                                name="chequeNo"
                                                value={invoiceData.chequeNo}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Cheque Date*</label>
                                            <DateInput
                                                value={invoiceData.chequeDate}
                                                min={today}
                                                onChange={(value) => setInvoiceData({ ...invoiceData, chequeDate: value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Cheque Amount*</label>
                                            <input
                                                type="number"
                                                name="chequeAmount"
                                                value={invoiceData.chequeAmount}
                                                onChange={handleInputChange}
                                                placeholder={getTotalAmount().toString()}
                                                required
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Bank Name*</label>
                                            <input
                                                type="text"
                                                name="bankName"
                                                value={invoiceData.bankName}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Branch Name*</label>
                                            <input
                                                type="text"
                                                name="branchName"
                                                value={invoiceData.branchName}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {invoiceData.paymentType === 'cash' && (
                                <div className="cash-details" style={{ marginTop: '20px' }}>
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label>Amount Paid (Rs.)*</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max={getTotalAmount()}
                                                value={paidAmount}
                                                onChange={(e) => setPaidAmount(e.target.value)}
                                                placeholder={`Total: Rs. ${getTotalAmount().toLocaleString()}`}
                                                required
                                            />
                                        </div>
                                    </div>
                                    {paidAmount && parseFloat(paidAmount) < getTotalAmount() && (() => {
                                        const remaining = Math.round((getTotalAmount() - parseFloat(paidAmount)) * 100) / 100;
                                        return (
                                            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#fff8e1', borderRadius: '8px', border: '1px solid #ffe082' }}>
                                                <p style={{ margin: 0, color: '#856404', fontSize: '13px' }}>
                                                    ⚠️ Remaining <strong>Rs. {remaining.toLocaleString()}</strong> will be added to dealer's credit.
                                                </p>
                                            </div>
                                        );
                                    })()}
                                    {paidAmount && parseFloat(paidAmount) > getTotalAmount() && (
                                        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#ffebee', borderRadius: '8px', border: '1px solid #ef9a9a' }}>
                                            <p style={{ margin: 0, color: '#c62828', fontSize: '13px' }}>
                                                ⚠️ Amount cannot exceed total invoice amount.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {invoiceData.paymentType === 'credit' && (
                                <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fff8e1', borderRadius: '10px', border: '1px solid #ffe082' }}>
                                    <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
                                        ⚠️ Credit payment will be added to dealer's outstanding balance with standard payment terms.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Total */}
                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f2f5', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: '#666' }}>Total Invoice Amount:</span>
                            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#101540' }}>Rs. {getTotalAmount().toLocaleString()}</span>
                        </div>

                        {/* Submit */}
                        <div className="form-actions" style={{ marginTop: '30px' }}>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                disabled={submitting || invoiceItems.length === 0 || !canCreateInvoice || (invoiceData.paymentType === 'cash' && (!paidAmount || parseFloat(paidAmount) > getTotalAmount()))}
                                style={{ 
                                    width: '100%', 
                                    padding: '15px', 
                                    borderRadius: '12px', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    gap: '10px',
                                    opacity: (submitting || invoiceItems.length === 0 || !canCreateInvoice) ? 0.7 : 1,
                                    cursor: (submitting || invoiceItems.length === 0 || !canCreateInvoice) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                        Creating Invoice...
                                    </>
                                ) : (
                                    <>
                                        <Save size={20} />
                                        Issue Invoice
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

export default InvoiceCreate;
