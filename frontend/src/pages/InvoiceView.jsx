import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import { Search, Eye, Download, Calendar, User, Loader2, AlertCircle, Trash2  } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { invoiceApi } from '../services/api';
import '../styles/Invoice.css';

const InvoiceView = () => {
    const { isAdmin, user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        start_date: '',
        end_date: '',
        status: '',
        dealer_name: ''
    });
    
    // Check if user is supervisor
    const isSupervisor = user?.role === 'SUPERVISOR';

    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const response = await invoiceApi.getAll();
                setInvoices(response.data.data || []);
            } catch (err) {
                console.error('Error fetching invoices:', err);
                setError(err.response?.data?.message || 'Failed to load invoices');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter((invoice) => {
        const matchesSearch = 
            invoice.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.dealer_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const totalPaid = parseFloat(invoice.total_paid) || 0;
        const pendingPaid = parseFloat(invoice.pending_paid) || 0;
        const totalPayments = totalPaid + pendingPaid;
        const totalAmount = parseFloat(invoice.total_amount) || 0;
        const isPaid = totalPaid >= totalAmount;
        const isPartial = totalPayments > 0 && totalPayments < totalAmount;
        const matchesStatus = filterStatus === 'all' || 
            (filterStatus === 'paid' && isPaid) ||
            (filterStatus === 'pending' && !isPaid && !isPartial) ||
            (filterStatus === 'partial' && isPartial);
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (invoice) => {
        const totalPaid = parseFloat(invoice.total_paid) || 0;
        const pendingPaid = parseFloat(invoice.pending_paid) || 0;
        const totalPayments = totalPaid + pendingPaid;
        const creditBalance = parseFloat(invoice.credit_balance) || 0;
        const totalAmount = parseFloat(invoice.total_amount) || 0;
        
        if (totalPaid >= totalAmount) {
            return { label: 'Paid', class: 'badge-success' };
        } else if (totalPayments > 0 && creditBalance > 0) {
            return { label: `Partial (Rs.${totalPayments.toLocaleString()})`, class: 'badge-warning' };
        } else if (pendingPaid > 0) {
            return { label: 'Pending', class: 'badge-warning' };
        } else {
            return { label: 'Pending', class: 'badge-danger' };
        }
    };

    const handleExport = async () => {
        try {
            setExportLoading(true);
            const response = await invoiceApi.exportToExcel(exportFilters);
            
            // Create blob and download
            const blob = new Blob([response.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            setShowExportModal(false);
        } catch (error) {
            console.error('Error exporting invoices:', error);
            alert(error.response?.data?.message || 'Failed to export invoices');
        } finally {
            setExportLoading(false);
        }
    };

    const handleDownloadPDF = async (invoiceId) => {
        try {
            const response = await invoiceApi.downloadPDF(invoiceId);
            // Check if we got a proper blob response
            if (response.data && response.data.size > 0) {
                const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
                const link = document.createElement('a');
                link.href = url;
                link.download = `invoice-${invoiceId}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            // Only show error if it's a real error, not a download manager intercept
            if (error.response) {
                // Try to read error message from blob
                try {
                    const text = await error.response.data?.text?.();
                    const json = text ? JSON.parse(text) : null;
                    alert(json?.message || 'Failed to download invoice PDF');
                } catch {
                    alert('Failed to download invoice PDF');
                }
            }
        }
    };

    const handleDelete = async (invoiceId) => {
        if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            return;
        }

        try {
            await invoiceApi.softDelete(invoiceId);
            // Remove the deleted invoice from local state immediately
            setInvoices(prev => prev.filter(inv => inv.invoice_id !== invoiceId));
            alert('Invoice deleted successfully');
        } catch (err) {
            console.error('Error deleting invoice:', err);
            alert(err.response?.data?.message || 'Failed to delete invoice');
        }
    };

    if (loading) {
        return (
            <>
                {isAdmin ? <AdminSidebar /> : <Sidebar />}
                <div className="invoice-container">
                    <main className="invoice-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
                    </main>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                {isAdmin ? <AdminSidebar /> : <Sidebar />}
                <div className="invoice-container">
                    <main className="invoice-main">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <AlertCircle size={60} color="#dc3545" style={{ marginBottom: '20px' }} />
                            <h2 style={{ color: '#101540', marginBottom: '10px' }}>Error Loading Invoices</h2>
                            <p style={{ color: '#666' }}>{error}</p>
                        </div>
                    </main>
                </div>
            </>
        );
    }

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
                        {isAdmin && (
                            <button 
                                className="btn btn-primary"
                                onClick={() => setShowExportModal(true)}
                            >
                                <Download size={20} />
                                Export Excel
                            </button>
                        )}
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Record ({filteredInvoices.length})</h3>
                            <div className="table-actions" >
                                <select
                                    className="filter-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="partial">Partial</option>
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
                        
                        {filteredInvoices.length === 0 ? (
                            <div style={{ textAlign: 'left', padding: '50px', color: '#666' }}>
                                {searchTerm || filterStatus !== 'all' ? 'No invoices match your search criteria.' : 'No invoices found.'}
                            </div>
                        ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice No</th>
                                    <th>Date</th>
                                    <th>Dealer</th>
                                    <th>Amount</th>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((invoice) => {
                                    const status = getStatusBadge(invoice);
                                    return (
                                    <tr key={invoice.invoice_id}>
                                        <td style={{ fontWeight: '600' }}>{invoice.invoice_number || invoice.invoice_id}</td>
                                        <td>{formatDate(invoice.created_at)}</td>
                                        <td>{invoice.dealer_name}</td>
                                        <td style={{ fontWeight: '500' }}>Rs. {parseFloat(invoice.total_amount || 0).toLocaleString()}</td>
                                        <td>{invoice.payment_type}</td>
                                        <td>
                                            <span className={`badge ${status.class}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'center' ,gap: '10px'}}>
                                                <button
                                                    className="action-btn action-btn-view"
                                                    onClick={() => { setSelectedInvoice(invoice); setShowModal(true); }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {isSupervisor && (
                                                    <button
                                                        className="action-btn"
                                                        style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
                                                        onClick={() => handleDelete(invoice.invoice_id)}
                                                        title="Delete Invoice"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        )}
                    </div>
                </main>

                {/* Export Modal */}
                {showExportModal && (
                    <div className="modal-overlay" onClick={() => !exportLoading && setShowExportModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    <Download size={24} style={{ marginRight: '10px' }} />
                                    Export Invoices
                                </h2>
                                <button 
                                    className="modal-close" 
                                    onClick={() => !exportLoading && setShowExportModal(false)}
                                    disabled={exportLoading}
                                >×</button>
                            </div>

                            <div className="modal-body" style={{ padding: '20px' }}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                        From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={exportFilters.start_date}
                                        onChange={e => setExportFilters(f => ({ ...f, start_date: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                        disabled={exportLoading}
                                    />
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                        To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={exportFilters.end_date}
                                        onChange={e => setExportFilters(f => ({ ...f, end_date: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                        disabled={exportLoading}
                                    />
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                        Status
                                    </label>
                                    <select
                                        value={exportFilters.status}
                                        onChange={e => setExportFilters(f => ({ ...f, status: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                        disabled={exportLoading}
                                    >
                                        <option value="">All Status</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Partial">Partial</option>
                                    </select>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                                        Dealer Name (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Filter by dealer name..."
                                        value={exportFilters.dealer_name}
                                        onChange={e => setExportFilters(f => ({ ...f, dealer_name: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            fontSize: '14px'
                                        }}
                                        disabled={exportLoading}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer" style={{ 
                                padding: '15px 20px', 
                                display: 'flex', 
                                justifyContent: 'flex-end', 
                                gap: '10px',
                                borderTop: '1px solid #eee' 
                            }}>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={() => setShowExportModal(false)}
                                    disabled={exportLoading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleExport}
                                    disabled={exportLoading}
                                    style={{ minWidth: '120px' }}
                                >
                                    {exportLoading ? (
                                        <>
                                            <Loader2 className="spinner" size={18} />
                                            Exporting...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={18} />
                                            Export
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invoice View Modal */}
                {showModal && selectedInvoice && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '700px', maxHeight: '90vh', padding: '0', boxShadow: '0 20px 45px rgba(0,0,0,0.2)', overflowY: 'auto' }}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>Invoice Details</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>Document #: {selectedInvoice.invoice_number || selectedInvoice.invoice_id}</p>
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
                                        <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{formatDate(selectedInvoice.created_at)}</p>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#999', marginBottom: '8px' }}>
                                            <User size={14} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Dealer Entity</span>
                                        </div>
                                        <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedInvoice.dealer_name}</p>
                                    </div>
                                </div>

                                {/* Dispatch Info */}
                                <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f0f4ff', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Dispatch Reference</div>
                                    <div style={{ fontWeight: '600', color: '#101540' }}>{selectedInvoice.dispatch_number}</div>
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
                                                {selectedInvoice.items?.length > 0 ? (
                                                    selectedInvoice.items.map((item, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx === selectedInvoice.items.length - 1 ? 'none' : '1px solid #f5f5f5' }}>
                                                            <td style={{ padding: '12px 15px', fontSize: '14px' }}>{item.cylinder_size || item.product_id} ({item.sale_type})</td>
                                                            <td style={{ padding: '12px 15px', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>{item.quantity}</td>
                                                            <td style={{ padding: '12px 15px', textAlign: 'right', fontSize: '14px' }}>Rs. {parseFloat(item.unit_price || 0).toLocaleString()}</td>
                                                            <td style={{ padding: '12px 15px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#101540' }}>Rs. {parseFloat(item.total_price || 0).toLocaleString()}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                                                            Item details not available
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div style={{ backgroundColor: '#f9fafb', padding: '25px', borderRadius: '20px', marginBottom: '30px', border: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</span>
                                            <span style={{ fontSize: '15px', color: '#111827', fontWeight: '600' }}>{selectedInvoice.payment_type}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
                                            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing Status</span>
                                            <span className={`badge ${getStatusBadge(selectedInvoice).class}`} style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 'bold' }}>
                                                {getStatusBadge(selectedInvoice).label.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ borderTop: '2px dashed #e5e7eb', paddingTop: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#374151' }}>Grand Total</span>
                                            <span style={{ fontSize: '26px', fontWeight: '800', color: '#101540' }}>Rs. {parseFloat(selectedInvoice.total_amount || 0).toLocaleString()}</span>
                                        </div>
                                        {/* Payment Breakdown */}
                                        {(parseFloat(selectedInvoice.total_paid) > 0 || parseFloat(selectedInvoice.pending_paid) > 0 || parseFloat(selectedInvoice.credit_balance) > 0) && (
                                            <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '10px', paddingTop: '10px', fontSize: '14px' }}>
                                                {parseFloat(selectedInvoice.total_paid) > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                        <span style={{ color: '#28a745' }}>Paid (Cleared)</span>
                                                        <span style={{ color: '#28a745', fontWeight: '600' }}>Rs. {parseFloat(selectedInvoice.total_paid).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {parseFloat(selectedInvoice.pending_paid) > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                        <span style={{ color: '#ffc107' }}>Cheque Pending</span>
                                                        <span style={{ color: '#ffc107', fontWeight: '600' }}>Rs. {parseFloat(selectedInvoice.pending_paid).toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {parseFloat(selectedInvoice.credit_balance) > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                        <span style={{ color: '#dc3545' }}>Credit Balance</span>
                                                        <span style={{ color: '#dc3545', fontWeight: '600' }}>Rs. {parseFloat(selectedInvoice.credit_balance).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                        onClick={() => handleDownloadPDF(selectedInvoice.invoice_id)}
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