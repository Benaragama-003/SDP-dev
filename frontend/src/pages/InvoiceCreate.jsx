import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Save, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DateInput from '../components/DateInput';
import '../styles/Invoice.css';
import { formatDate } from '../utils/dateUtils';

const InvoiceCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [showDealerDropdown, setShowDealerDropdown] = useState(false);

    // Mock dealers data
    const dealers = [
        { id: 'D001', name: 'ABC Stores', contact: '0771234567', route: 'Route A' },
        { id: 'D002', name: 'XYZ Mart', contact: '0777654321', route: 'Route B' },
        { id: 'D003', name: 'LMN Distributors', contact: '0769876543', route: 'Route A' },
        { id: 'D004', name: 'PQR Suppliers', contact: '0775432167', route: 'Route C' },
    ];

    // Mock active dispatch data
    const activeDispatch = {
        id: 'D001',
        lorry: 'CAA-1234',
        supervisor: user?.name || 'John Supervisor',
        route: 'Route A'
    };

    const [allocatedItems, setAllocatedItems] = useState([]);
    // mock data for prices
    const productPrices = {
        '2kg': { filled: 800, new: 1800 },
        '5kg': { filled: 1500, new: 3500 },
        '12.5kg': { filled: 3000, new: 7500 },
        '37.5kg': { filled: 8500, new: 18500 },
        '20kg': { filled: 4500, new: 9500 }
    };

    const [invoiceData, setInvoiceData] = useState({
        dealer: '',
        route: '',
        telephone: '',
        supervisor: '',
        lorryNo: '',
        date: new Date().toISOString().split('T')[0],
        chequeAmount: '',
        bankName: '',
        branchName: '',
        paidAmount: ''
    });

    // Auto-populate supervisor and lorry from active dispatch
    useEffect(() => {
        setInvoiceData(prev => ({
            ...prev,
            supervisor: activeDispatch.supervisor,
            lorryNo: activeDispatch.lorry
        }));
    }, [user]);

    const handleInputChange = (e) => {
        setInvoiceData({
            ...invoiceData,
            [e.target.name]: e.target.value
        });
    };

    const handleDealerSelect = (dealer) => {
        setInvoiceData({
            ...invoiceData,
            dealer: dealer.name,
            route: dealer.route,
            telephone: dealer.contact
        });
        setSearchTerm(dealer.name);
        setShowDealerDropdown(false);
    };

    const filteredDealers = dealers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTotalAmount = () => {
        return allocatedItems.reduce((sum, item) => {
            const pricing = productPrices[item.product_id] || { filled: 0, new: 0 };
            const price = item.type === 'new' ? pricing.new : pricing.filled;
            return sum + (price * (parseInt(item.quantity) || 0));
        }, 0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const fullInvoiceData = { ...invoiceData, items: allocatedItems, total: getTotalAmount() };
        console.log('Invoice Created:', fullInvoiceData);
        alert('Invoice issued successfully!');
    };

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
                                            {filteredDealers.map(dealer => (
                                                <div
                                                    key={dealer.id}
                                                    onClick={() => handleDealerSelect(dealer)}
                                                    style={{ padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                                                    onMouseOver={(e) => e.target.style.background = '#f5f5f5'}
                                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                                >
                                                    <strong>{dealer.name}</strong> <span style={{ fontSize: '12px', color: '#666' }}>({dealer.id})</span>
                                                </div>
                                            ))}
                                            {filteredDealers.length === 0 && (
                                                <div style={{ padding: '10px 15px', color: '#999' }}>No dealers found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="form-field">
                                    <label>Route*</label>
                                    <input
                                        type="text"
                                        name="route"
                                        value={invoiceData.route}
                                        onChange={handleInputChange}
                                        readOnly
                                        style={{ backgroundColor: '#f9f9f9' }}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Telephone No.*</label>
                                    <input
                                        type="tel"
                                        name="telephone"
                                        value={invoiceData.telephone}
                                        onChange={handleInputChange}
                                        readOnly
                                        style={{ backgroundColor: '#f9f9f9' }}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Supervisor*</label>
                                    <input
                                        type="text"
                                        name="supervisor"
                                        value={invoiceData.supervisor}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Lorry No.*</label>
                                    <input
                                        type="text"
                                        name="lorryNo"
                                        value={invoiceData.lorryNo}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Date*</label>
                                    <DateInput
                                        value={invoiceData.date}
                                        min={today}
                                        onChange={(value) => setInvoiceData({ ...invoiceData, date: value })}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items Grid */}
                        <div className="allocation-section" style={{ marginTop: '30px', padding: '25px', backgroundColor: '#fdfdfd', borderRadius: '20px', border: '1px solid #eee' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 className="section-title" style={{ fontSize: '18px', margin: 0 }}>Product Allocation</h3>
                                <button
                                    type="button"
                                    onClick={() => setAllocatedItems([...allocatedItems, { product_id: '', type: 'filled', quantity: '' }])}
                                    style={{ backgroundColor: '#101540', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                                >
                                    <Plus size={14} /> Add Product
                                </button>
                            </div>

                            <div className="allocation-list">
                                {allocatedItems.length === 0 && (
                                    <p style={{ textAlign: 'center', color: '#999', padding: '20px', fontSize: '14px', border: '1px dashed #ddd', borderRadius: '10px' }}>No products allocated yet. Click "Add Product" to start.</p>
                                )}
                                {allocatedItems.map((item, index) => (
                                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 40px', gap: '15px', marginBottom: '12px', alignItems: 'center' }}>
                                        <select
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                            value={item.product_id}
                                            onChange={(e) => {
                                                const newItems = [...allocatedItems];
                                                newItems[index].product_id = e.target.value;
                                                setAllocatedItems(newItems);
                                            }}
                                            required
                                        >
                                            <option value="">Select Size</option>
                                            <option value="2kg">2kg </option>
                                            <option value="5kg">5kg </option>
                                            <option value="12.5kg">12.5kg </option>
                                            <option value="37.5kg">37.5kg </option>
                                        </select>
                                        <select
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                            value={item.type}
                                            onChange={(e) => {
                                                const newItems = [...allocatedItems];
                                                newItems[index].type = e.target.value;
                                                setAllocatedItems(newItems);
                                            }}
                                            required
                                        >
                                            <option value="filled">Filled </option>
                                            <option value="new">New </option>
                                        </select>
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            min="1"
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newItems = [...allocatedItems];
                                                newItems[index].quantity = e.target.value;
                                                setAllocatedItems(newItems);
                                            }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setAllocatedItems(allocatedItems.filter((_, i) => i !== index))}
                                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Payment Section */}
                        <div className="form-section">
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
                                    <span>Cheques</span>
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

                            {invoiceData.paymentType === 'cash' && (
                                <div className="cash-details" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '10px', border: '1px solid #eee' }}>
                                    <div className="form-field" style={{ maxWidth: '300px' }}>
                                        <label>Paid Amount (Rs.)*</label>
                                        <input
                                            type="number"
                                            name="paidAmount"
                                            value={invoiceData.paidAmount}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="Enter amount paid"
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                                        />
                                    </div>
                                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#666' }}>Balance to return:</span>
                                        <span style={{ fontWeight: 'bold', color: (parseFloat(invoiceData.paidAmount) || 0) - getTotalAmount() >= 0 ? '#2e7d32' : '#dc3545' }}>
                                            Rs. {Math.max(0, (parseFloat(invoiceData.paidAmount) || 0) - getTotalAmount()).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {invoiceData.paymentType === 'cheque' && (
                                <div className="cheque-details">
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
                        </div>

                        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f2f5', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '600', color: '#666' }}>Total Invoice Amount:</span>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#101540' }}>Rs. {getTotalAmount().toLocaleString()}</span>
                        </div>

                        <div className="form-actions" style={{ marginTop: '30px' }}>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                <Save size={20} />
                                Issue Invoice
                            </button>
                        </div>
                    </form>
                </main>
            </div>
        </>
    );
};

export default InvoiceCreate;
