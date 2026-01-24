import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import { Search, Eye, Download, FileText, Calendar, User, CreditCard } from 'lucide-react';
import '../styles/Invoice.css';

const InvoiceView = () => {
    const { isAdmin } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Mock invoice data
    const invoices = [
        {
            id: 'INV-001',
            date: '2026-01-10',
            dealer: 'ABC Stores',
            total: 45000,
            status: 'paid',
            paymentType: 'Cash',
            items: [
                { size: '5kg', type: 'Filled', qty: 10, rate: 1500, amount: 15000 },
                { size: '12.5kg', type: 'Filled', qty: 5, rate: 3000, amount: 15000 },
                { size: '5kg', type: 'New', qty: 5, rate: 3000, amount: 15000 }
            ]
        },
        {
            id: 'INV-002',
            date: '2026-01-11',
            dealer: 'XYZ Mart',
            total: 78000,
            status: 'pending',
            paymentType: 'Credit',
            items: [
                { size: '12.5kg', type: 'Filled', qty: 26, rate: 3000, amount: 78000 }
            ]
        },
        // ... adding items to others
    ];

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch = invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.dealer.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <>
            {isAdmin ? <AdminSidebar /> : <Sidebar />}
            <div className="invoice-container">
                <main className="invoice-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Invoice Archive</h1>
                            <p className="page-subtitle">Browse and manage all generated invoices</p>
                        </div>
                        <button className="btn btn-primary">
                            <Download size={20} />
                            Export Excel
                        </button>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Records</h3>
                            <div className="table-actions">
                                <select
                                    className="filter-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                </select>
                                <div className="search-box">
                                    <Search className="search-icon" size={20} />
                                    <input
                                        type="text"
                                        className="search-input"
                                        placeholder="Search invoices..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Date</th>
                                    <th>Dealer</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td style={{ fontWeight: '600' }}>{invoice.id}</td>
                                        <td>{invoice.date}</td>
                                        <td>{invoice.dealer}</td>
                                        <td style={{ fontWeight: '500' }}>Rs. {invoice.total.toLocaleString()}</td>
                                        <td>{invoice.paymentType}</td>
                                        <td>
                                            <span className={`badge ${invoice.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button
                                                    className="action-btn action-btn-view"
                                                    onClick={() => { setSelectedInvoice(invoice); setShowModal(true); }}
                                                >
                                                    <Eye size={16} /> View Details
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Harmonized Invoice View Modal */}
                {showModal && selectedInvoice && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '700px', maxHeight: '90vh', padding: '0', boxShadow: '0 20px 45px rgba(0,0,0,0.2)', overflowY: 'auto' }}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>Invoice Details</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>Document #: {selectedInvoice.id}</p>
                                </div>
                                <button className="modal-close" onClick={() => setShowModal(false)} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999', marginBottom: '8px' }}>
                                            <Calendar size={14} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Issued Date</span>
                                        </div>
                                        <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedInvoice.date}</p>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999', marginBottom: '8px' }}>
                                            <User size={14} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Dealer Entity</span>
                                        </div>
                                        <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedInvoice.dealer}</p>
                                    </div>
                                </div>

                                {/* Purchased Items Section */}
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#101540', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Purchased Items</h3>
                                    <div style={{ borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ backgroundColor: '#f9f9f9' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '12px', color: '#666' }}>Product</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: '12px', color: '#666' }}>Qty</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '12px', color: '#666' }}>Rate</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '12px', color: '#666' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedInvoice.items?.map((item, idx) => (
                                                    <tr key={idx} style={{ borderBottom: idx === selectedInvoice.items.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px' }}>{item.size} {item.type}</td>
                                                        <td style={{ padding: '12px 15px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>{item.qty}</td>
                                                        <td style={{ padding: '12px 15px', textAlign: 'right', fontSize: '14px' }}>Rs. {item.rate.toLocaleString()}</td>
                                                        <td style={{ padding: '12px 15px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#101540' }}>Rs. {item.amount.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#f9fafb', padding: '25px', borderRadius: '20px', marginBottom: '30px', border: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</span>
                                            <span style={{ fontSize: '15px', color: '#111827', fontWeight: '600' }}>{selectedInvoice.paymentType}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing Status</span>
                                            <span className={`badge ${selectedInvoice.status === 'paid' ? 'badge-success' : 'badge-warning'}`} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>
                                                {selectedInvoice.status.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ borderTop: '2px dashed #e5e7eb', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>Grand Total</span>
                                        <span style={{ fontSize: '26px', fontWeight: '800', color: '#101540' }}>Rs. {selectedInvoice.total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between' }}>
                                    <button
                                        className="btn"
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#dc3545',
                                            color: 'white',
                                            padding: '16px 20px',
                                            borderRadius: '15px',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: '0 5px 15px rgba(220, 53, 69, 0.2)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => setShowModal(false)}
                                    >
                                        Close Portal
                                    </button>
                                    <button
                                        className="btn"
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#bfbf2a',
                                            color: 'white',
                                            padding: '16px 20px',
                                            borderRadius: '15px',
                                            fontWeight: 'bold',
                                            fontSize: '16px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            boxShadow: '0 5px 15px rgba(191, 191, 42, 0.2)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Download size={20} /> Download PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default InvoiceView;
