import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, DollarSign, Calendar, Clock, CreditCard } from 'lucide-react';
import '../styles/Dealers.css';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';

const MOCK_OUTSTANDING_INVOICES = {
    'CR-001': [
        { credit_id: 'INV-101', invoice_number: 'INV-2024-001', remaining_balance: 40000 },
        { credit_id: 'INV-102', invoice_number: 'INV-2024-005', remaining_balance: 35000 },
    ],
    'CR-002': [
        { credit_id: 'INV-201', invoice_number: 'INV-2024-010', remaining_balance: 180000 },
    ],
    'CR-003': [
        { credit_id: 'INV-301', invoice_number: 'INV-2024-015', remaining_balance: 10000 },
    ],
    'CR-004': [
        { credit_id: 'INV-401', invoice_number: 'INV-2024-020', remaining_balance: 45000 },
    ],
};



const SupervisorCredit = () => {
    const today = new Date().toISOString().split('T')[0];
    const [searchTerm, setSearchTerm] = useState('');

    const [creditAccounts, setCreditAccounts] = useState([
        { id: 'CR-001', dealer: 'ABC Stores', totalCredit: 125000, used: 75000, available: 50000, overdue: 0, status: 'pending' },
        { id: 'CR-002', dealer: 'XYZ Mart', totalCredit: 200000, used: 180000, available: 20000, overdue: 0, status: 'pending' },
        { id: 'CR-003', dealer: 'LMN Distributors', totalCredit: 150000, used: 160000, available: 0, overdue: 10000, status: 'overdue' },
        { id: 'CR-004', dealer: 'PQR Suppliers', totalCredit: 100000, used: 45000, available: 55000, overdue: 0, status: 'pending' },
    ]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' or 'CHEQUE'
    const [chequeDetails, setChequeDetails] = useState({ number: '', bank: '', date: '' });

    // Mock history data
    const settlementHistoryData = [
        { id: 'SET-001', accountId: 'CR-001', date: '2026-01-10', amount: 25000, method: 'Cash' },
        { id: 'SET-002', accountId: 'CR-001', date: '2026-01-12', amount: 15000, method: 'Cheque' },
        { id: 'SET-003', accountId: 'CR-002', date: '2026-01-14', amount: 50000, method: 'Cash' },
    ];

    const filtered = creditAccounts.filter(c =>
        c.dealer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = {
        totalCredit: creditAccounts.reduce((sum, c) => sum + c.totalCredit, 0),
        totalUsed: creditAccounts.reduce((sum, c) => sum + c.used, 0),
        totalOverdue: creditAccounts.reduce((sum, c) => sum + c.overdue, 0)
    };

    const handleSettlement = (e) => {
        e.preventDefault();

        if (!selectedInvoiceId) {
            alert("Please select an invoice first!");
            return;
        }

        const amount = Number(e.target.amount.value);
        const invoice = MOCK_OUTSTANDING_INVOICES[selectedAccount.id].find(i => i.credit_id === selectedInvoiceId);

        if (amount > invoice.remaining_balance) {
            alert("Amount cannot exceed invoice balance!");
            return;
        }

        setCreditAccounts(accounts => accounts.map(acc => {
            if (acc.id === selectedAccount.id) {
                const newUsed = acc.used - amount;
                return {
                    ...acc,
                    used: newUsed,
                    available: acc.totalCredit - newUsed,
                    // Status logic could be added here
                };
            }
            return acc;
        }));

        setShowSettleModal(false);
        setSelectedInvoiceId('');
        setPaymentMethod('CASH');
        alert(`Successfully settled Rs. ${amount.toLocaleString()} for ${invoice.invoice_number} via ${paymentMethod}`);
    };

    return (
        <>
            <Sidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Credit Collection</h1>
                            <p className="page-subtitle">Manage and settle dealer credit accounts</p>
                        </div>
                    </div>

                    <div className="stats-grid" style={{ marginBottom: '30px' }}>
                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#4facfe' }}>
                                    <DollarSign size={20} />
                                </div>
                                <span className="stat-title">Total Credit extended</span>
                            </div>
                            <div className="stat-value">Rs. {totals.totalCredit.toLocaleString()}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#fa709a' }}>
                                    <Clock size={20} />
                                </div>
                                <span className="stat-title">Currently Used</span>
                            </div>
                            <div className="stat-value">Rs. {totals.totalUsed.toLocaleString()}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#ea4848' }}>
                                    <CreditCard size={20} />
                                </div>
                                <span className="stat-title">Overdue Amount</span>
                            </div>
                            <div className="stat-value">Rs. {totals.totalOverdue.toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Dealer Credit Accounts</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by dealer or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th style={{ width: '90px' }}>Account ID</th>
                                        <th style={{ width: '150px' }}>Dealer</th>
                                        <th style={{ width: '110px' }}>Credit Limit</th>
                                        <th style={{ width: '100px' }}>Used</th>
                                        <th style={{ width: '100px' }}>Available</th>
                                        <th style={{ width: '90px' }}>Overdue</th>
                                        <th style={{ width: '100px' }}>Status</th>
                                        <th style={{ width: '150px', minWidth: '150px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((account) => (
                                        <tr key={account.id}>
                                            <td style={{ fontWeight: '600' }}>{account.id}</td>
                                            <td>{account.dealer}</td>
                                            <td>Rs. {account.totalCredit.toLocaleString()}</td>
                                            <td style={{ color: '#101540', fontWeight: '500' }}>Rs. {account.used.toLocaleString()}</td>
                                            <td style={{ color: '#4caf50', fontWeight: '500' }}>Rs. {account.available.toLocaleString()}</td>
                                            <td style={{ color: account.overdue > 0 ? '#dc3545' : 'inherit', fontWeight: '600' }}>
                                                Rs. {account.overdue.toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`badge ${account.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                                    {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{
                                                            backgroundColor: '#bfbf2a',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '500',
                                                            minWidth: '50px',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onClick={() => { setSelectedAccount(account); setShowSettleModal(true); }}
                                                    >
                                                        Settle
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{
                                                            backgroundColor: '#101540',
                                                            color: 'white',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: '500',
                                                            minWidth: '50px',
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                        onClick={() => { setSelectedAccount(account); setShowHistoryModal(true); }}
                                                    >
                                                        History
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {/* Settle Modal */}
                {showSettleModal && selectedAccount && (
                    <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '20px', maxWidth: '500px', padding: '0', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#333' }}>Settle Payment</h1>
                                <button className="modal-close" onClick={() => setShowSettleModal(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>
                            </div>
                            <form onSubmit={handleSettlement}>
                                <div style={{ padding: '30px', marginTop: '-50px', minHeight: '400px' }}>
                                    <div style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '13px', marginBottom: '5px' }}>Dealer</label>
                                            <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedAccount.dealer}</p>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '13px', marginBottom: '5px' }}>Outstanding</label>
                                            <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#dc3545' }}>Rs. {selectedAccount.used.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Invoice Dropdown */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#333', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Select Invoice</label>
                                        <select
                                            value={selectedInvoiceId}
                                            onChange={(e) => setSelectedInvoiceId(e.target.value)}
                                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none' }}
                                            required
                                        >
                                            <option value="">-- Choose Invoice --</option>
                                            {(MOCK_OUTSTANDING_INVOICES[selectedAccount.id] || []).map(inv => (
                                                <option key={inv.credit_id} value={inv.credit_id}>
                                                    {inv.invoice_number} (Bal: Rs. {inv.remaining_balance.toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#333', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Payment Method</label>
                                        <div style={{ display: 'flex', gap: '30px', padding: '5px 0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', color: '#444' }}>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="CASH"
                                                    checked={paymentMethod === 'CASH'}
                                                    onChange={() => setPaymentMethod('CASH')}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                Cash
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', color: '#444' }}>
                                                <input
                                                    type="radio"
                                                    name="paymentMethod"
                                                    value="CHEQUE"
                                                    checked={paymentMethod === 'CHEQUE'}
                                                    onChange={() => setPaymentMethod('CHEQUE')}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                Cheque
                                            </label>
                                        </div>
                                    </div>

                                    {/* Optional Cheque Details */}
                                    {paymentMethod === 'CHEQUE' && (
                                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Cheque Number"
                                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '14px' }}
                                                    onChange={(e) => setChequeDetails({ ...chequeDetails, number: e.target.value })}
                                                    required
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Bank Name"
                                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '14px' }}
                                                    onChange={(e) => setChequeDetails({ ...chequeDetails, bank: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <DateInput
                                                    value={chequeDetails.date}
                                                    min={today}
                                                    onChange={(value) => setChequeDetails({ ...chequeDetails, date: value })}
                                                    required
                                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#333', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Payment Amount (Rs)</label>
                                        <input
                                            type="number"
                                            name="amount"
                                            required
                                            placeholder="Enter settlement amount"
                                            style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowSettleModal(false)}
                                            style={{ flex: 1, backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            style={{ flex: 1.5, backgroundColor: '#bfbf2a', color: 'white', border: 'none', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                                        >
                                            Settle Now
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {showHistoryModal && selectedAccount && (
                    <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
                        <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '20px', maxWidth: '650px', padding: '0', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#333' }}>Settlement History</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>{selectedAccount.dealer} ({selectedAccount.id})</p>
                                </div>
                                <button className="modal-close" onClick={() => setShowHistoryModal(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>
                            </div>
                            <div style={{ padding: '30px' }}>
                                <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '10px', border: '1px solid #eee' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ backgroundColor: '#f9f9f9', position: 'sticky', top: '0' }}>
                                            <tr>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Date</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Method</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {settlementHistoryData
                                                .filter(h => h.accountId === selectedAccount.id)
                                                .map((h, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#333' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Calendar size={14} color="#999" />
                                                                {formatDate(h.date)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#333' }}>{h.method}</td>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#101540', fontWeight: '600', textAlign: 'right' }}>Rs. {h.amount.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            {settlementHistoryData.filter(h => h.accountId === selectedAccount.id).length === 0 && (
                                                <tr>
                                                    <td colSpan="3" style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>
                                                        No past settlements found for this account.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => setShowHistoryModal(false)}
                                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '12px 60px', borderRadius: '30px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Close History
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

export default SupervisorCredit;
