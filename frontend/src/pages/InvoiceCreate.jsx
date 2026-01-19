import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../styles/Invoice.css';

const InvoiceCreate = () => {
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

    const [invoiceData, setInvoiceData] = useState({
        dealer: '',
        route: '',
        telephone: '',
        supervisor: '',
        lorryNo: '',
        date: new Date().toISOString().split('T')[0],
        items: {
            '5kg': { filled: 0, new: 0, amount: 0 },
            '12.5kg': { filled: 0, new: 0, amount: 0 },
            '37.5kg': { filled: 0, new: 0, amount: 0 }
        },
        paymentType: 'cash',
        chequeNo: '',
        chequeDate: '',
        chequeAmount: ''
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

    const handleItemChange = (size, field, value) => {
        const newItems = { ...invoiceData.items };
        newItems[size][field] = parseInt(value) || 0;

        // Auto-calculate amount if filled or new changed
        if (field === 'filled' || field === 'new') {
            const pricePerItem = size === '5kg' ? 1500 : size === '12.5kg' ? 3000 : 8500;
            newItems[size].amount = (newItems[size].filled + newItems[size].new) * pricePerItem;
        }

        setInvoiceData({
            ...invoiceData,
            items: newItems
        });
    };

    const getTotalAmount = () => {
        return Object.values(invoiceData.items).reduce((sum, item) => sum + item.amount, 0);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Invoice Created:', invoiceData);
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
                                    <input
                                        type="date"
                                        name="date"
                                        value={invoiceData.date}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Items Grid */}
                        <div className="form-section">
                            <h3 className="section-title">Products</h3>
                            <div className="items-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Cylinder Size</th>
                                            <th>Filled</th>
                                            <th>New</th>
                                            <th>Amount (Rs.)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(invoiceData.items).map(([size, values]) => (
                                            <tr key={size}>
                                                <td className="size-cell">{size}</td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={values.filled}
                                                        onChange={(e) => handleItemChange(size, 'filled', e.target.value)}
                                                        className="table-input"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={values.new}
                                                        onChange={(e) => handleItemChange(size, 'new', e.target.value)}
                                                        className="table-input"
                                                    />
                                                </td>
                                                <td className="amount-cell">Rs. {values.amount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="3" className="total-label">Total Amount</td>
                                            <td className="total-amount">Rs. {getTotalAmount().toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
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
                                            <input
                                                type="date"
                                                name="chequeDate"
                                                value={invoiceData.chequeDate}
                                                onChange={handleInputChange}
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
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-secondary">
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
