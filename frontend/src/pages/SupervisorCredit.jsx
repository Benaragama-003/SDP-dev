import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, DollarSign, Calendar, Clock, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import '../styles/Dealers.css';
import { formatDate } from '../utils/dateUtils';
import DateInput from '../components/DateInput';
import { creditApi } from '../services/api';

const SupervisorCredit = () => {
    const today = new Date().toISOString().split('T')[0];
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [creditAccounts, setCreditAccounts] = useState([]);
    const [summary, setSummary] = useState({ totalCredit: 0, totalRemaining: 0, totalOverdue: 0 });
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [dealerCredits, setDealerCredits] = useState([]);
    const [settlementHistory, setSettlementHistory] = useState([]);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const [selectedCreditId, setSelectedCreditId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [chequeDetails, setChequeDetails] = useState({ number: '', bank: '', branch: '', date: '' });

    // Fetch all credits on mount
    useEffect(() => {
        fetchCredits();
    }, []);

    const fetchCredits = async () => {
        setLoading(true);
        try {

            const response = await creditApi.getAll();
            const data = response.data.data;
            setCreditAccounts(data.credits || []);
            setSummary(data.summary || { totalCredit: 0, totalRemaining: 0, totalOverdue: 0 });
        } catch (err) {
            console.error('Failed to fetch credits:', err);
            setError(err.response?.data?.message || 'Failed to load credit data');
        } finally {
            setLoading(false);
        }
    };

    // Fetch dealer credits when opening settle modal
    const handleOpenSettle = async (account) => {
        setSelectedAccount(account);
        setShowSettleModal(true);
        setLoadingDetails(true);
        setSelectedCreditId('');
        setPaymentMethod('CASH');
        setChequeDetails({ number: '', bank: '', branch: '', date: '' });

        try {
            const response = await creditApi.getDealerCredits(account.dealer_id);
            setDealerCredits(response.data.data.credits || []);
        } catch (err) {
            console.error('Failed to fetch dealer credits:', err);
            alert('Failed to load outstanding invoices');
        } finally {
            setLoadingDetails(false);
        }
    };

    // Fetch settlement history
    const handleOpenHistory = async (account) => {
        setSelectedAccount(account);
        setShowHistoryModal(true);
        setLoadingDetails(true);

        try {
            const response = await creditApi.getHistory(account.dealer_id);
            setSettlementHistory(response.data.data || []);
        } catch (err) {
            console.error('Failed to fetch history:', err);
            setSettlementHistory([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    const filtered = creditAccounts.filter(c =>
        c.dealer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.dealer_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSettlement = async (e) => {
        e.preventDefault();

        if (!selectedCreditId) {
            alert("Please select an invoice first!");
            return;
        }

        const amount = Number(e.target.amount.value);
        const selectedCredit = dealerCredits.find(c => c.credit_id === selectedCreditId);

        if (!selectedCredit) {
            alert("Invalid credit selection");
            return;
        }

        if (amount > parseFloat(selectedCredit.remaining_balance)) {
            alert(`Amount cannot exceed remaining balance (Rs. ${parseFloat(selectedCredit.remaining_balance).toLocaleString()})`);
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                credit_id: selectedCreditId,
                amount: amount,
                payment_method: paymentMethod,
                cheque_details: paymentMethod === 'CHEQUE' ? chequeDetails : null
            };

            await creditApi.settle(payload);

            alert(`Successfully settled Rs. ${amount.toLocaleString()} for ${selectedCredit.invoice_number}`);
            setShowSettleModal(false);
            setSelectedCreditId('');
            setPaymentMethod('CASH');
            setChequeDetails({ number: '', bank: '', branch: '', date: '' });

            // Refresh data
            fetchCredits();
        } catch (err) {
            console.error('Settlement failed:', err);
            alert(err.response?.data?.message || 'Failed to settle payment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <>
                <Sidebar />
                <div className="dealers-container">
                    <main className="dealers-main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
                    </main>
                </div>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Sidebar />
                <div className="dealers-container">
                    <main className="dealers-main">
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <AlertCircle size={60} color="#dc3545" style={{ marginBottom: '20px' }} />
                            <h2 style={{ color: '#101540', marginBottom: '10px' }}>Error Loading Credits</h2>
                            <p style={{ color: '#666' }}>{error}</p>
                            <button onClick={fetchCredits} style={{ marginTop: '20px', padding: '10px 30px', backgroundColor: '#101540', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                Retry
                            </button>
                        </div>
                    </main>
                </div>
            </>
        );
    }

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
                                <span className="stat-title">Total Credit Issued</span>
                            </div>
                            <div className="stat-value">Rs. {parseFloat(summary.totalCredit || 0).toLocaleString()}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#fa709a' }}>
                                    <Clock size={20} />
                                </div>
                                <span className="stat-title">Outstanding Balance</span>
                            </div>
                            <div className="stat-value">Rs. {parseFloat(summary.totalRemaining || 0).toLocaleString()}</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-header">
                                <div className="stat-icon" style={{ backgroundColor: '#ea4848' }}>
                                    <CreditCard size={20} />
                                </div>
                                <span className="stat-title">Overdue Amount</span>
                            </div>
                            <div className="stat-value">Rs. {parseFloat(summary.totalOverdue || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Credit Accounts ({creditAccounts.length})</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by dealer..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                {searchTerm ? 'No dealers match your search.' : 'No outstanding credits found.'}
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="data-table" style={{ width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th>Dealer</th>
                                            <th>Route</th>
                                            <th>Invoices</th>
                                            <th>Total Credit</th>
                                            <th>Remaining</th>
                                            <th>Overdue</th>
                                            <th>Status</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((account) => (
                                            <tr key={account.dealer_id}>
                                                <td>
                                                    <div style={{ fontWeight: '600' }}>{account.dealer_name}</div>
                                                </td>
                                                <td>{account.route || '-'}</td>
                                                <td>{account.total_invoices}</td>
                                                <td>Rs. {parseFloat(account.total_credit).toLocaleString()}</td>
                                                <td style={{ color: '#101540', fontWeight: '600' }}>
                                                    Rs. {parseFloat(account.total_remaining).toLocaleString()}
                                                </td>
                                                <td style={{ color: parseFloat(account.total_overdue) > 0 ? '#dc3545' : 'inherit', fontWeight: '600' }}>
                                                    Rs. {parseFloat(account.total_overdue).toLocaleString()}
                                                </td>
                                                <td>
                                                    <span className={`badge ${parseFloat(account.total_overdue) > 0 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {parseFloat(account.total_overdue) > 0 ? 'Overdue' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ backgroundColor: '#bfbf2a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}
                                                            onClick={() => handleOpenSettle(account)}
                                                        >
                                                            Settle
                                                        </button>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ backgroundColor: '#101540', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}
                                                            onClick={() => handleOpenHistory(account)}
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
                        )}
                    </div>
                </main>

                {/* Settle Modal */}
                {showSettleModal && selectedAccount && (
                    <div className="modal-overlay" onClick={() => setShowSettleModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '20px', maxWidth: '500px', padding: '0', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#333' }}>Settle Payment</h1>
                                <button className="modal-close" onClick={() => setShowSettleModal(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>
                            </div>
                            <form onSubmit={handleSettlement}>
                                <div style={{ padding: '30px' }}>
                                    <div style={{ marginBottom: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '13px', marginBottom: '5px' }}>Dealer</label>
                                            <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#333' }}>{selectedAccount.dealer_name}</p>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', color: '#666', fontSize: '13px', marginBottom: '5px' }}>Outstanding</label>
                                            <p style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#dc3545' }}>Rs. {parseFloat(selectedAccount.total_remaining).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Invoice Dropdown */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#333', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Select Invoice</label>
                                        {loadingDetails ? (
                                            <div style={{ textAlign: 'center', padding: '20px' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /></div>
                                        ) : (
                                            <select
                                                value={selectedCreditId}
                                                onChange={(e) => setSelectedCreditId(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', outline: 'none' }}
                                                required
                                            >
                                                <option value="">-- Choose Invoice --</option>
                                                {dealerCredits.map(credit => (
                                                    <option key={credit.credit_id} value={credit.credit_id}>
                                                        {credit.invoice_number} (Bal: Rs. {parseFloat(credit.remaining_balance).toLocaleString()}) {credit.status === 'OVERDUE' ? '⚠️ OVERDUE' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Payment Method Selector */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#333', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Payment Method</label>
                                        <div style={{ display: 'flex', gap: '30px', padding: '5px 0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', color: '#444' }}>
                                                <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} style={{ width: '18px', height: '18px' }} />
                                                Cash
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', color: '#444' }}>
                                                <input type="radio" name="paymentMethod" value="CHEQUE" checked={paymentMethod === 'CHEQUE'} onChange={() => setPaymentMethod('CHEQUE')} style={{ width: '18px', height: '18px' }} />
                                                Cheque
                                            </label>
                                        </div>
                                    </div>

                                    {/* Cheque Details */}
                                    {paymentMethod === 'CHEQUE' && (
                                        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #eee' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                                <input type="text" placeholder="Cheque Number" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '14px' }}
                                                    value={chequeDetails.number} onChange={(e) => setChequeDetails({ ...chequeDetails, number: e.target.value })} />
                                                <input type="text" placeholder="Bank Name" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '14px', width: '100%' }}
                                                    value={chequeDetails.bank} onChange={(e) => setChequeDetails({ ...chequeDetails, bank: e.target.value })} />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <input type="text" placeholder="Branch" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '14px' }}
                                                    value={chequeDetails.branch} onChange={(e) => setChequeDetails({ ...chequeDetails, branch: e.target.value })} />
                                                <div style={{ position: 'relative' }}>
                                                    <DateInput
                                                        value={chequeDetails.date}
                                                        min={today}
                                                        onChange={(value) => setChequeDetails({ ...chequeDetails, date: value })}
                                                        required
                                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{ display: 'block', color: '#333', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Payment Amount (Rs)</label>
                                        <input type="number" name="amount" required min="1" placeholder="Enter settlement amount"
                                            style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', outline: 'none' }} />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                        <button type="button" onClick={() => setShowSettleModal(false)} disabled={submitting}
                                            style={{ flex: 1, backgroundColor: 'transparent', color: '#666', border: '2px solid #ddd', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: submitting ? 0.6 : 1, transition: 'all 0.2s' }}>
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={submitting}
                                            style={{ flex: 1.5, backgroundColor: '#101540', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', opacity: submitting ? 0.6 : 1, transition: 'all 0.2s' }}>
                                            {submitting ? 'Settling...' : '✓ Settle Payment'}
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
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>{selectedAccount.dealer_name}</p>
                                </div>
                                <button className="modal-close" onClick={() => setShowHistoryModal(false)} style={{ fontSize: '24px', border: 'none', background: 'none', cursor: 'pointer', color: '#999' }}>×</button>
                            </div>
                            <div style={{ padding: '30px' }}>
                                {loadingDetails ? (
                                    <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} /></div>
                                ) : (
                                    <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '10px', border: '1px solid #eee' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ backgroundColor: '#f9f9f9', position: 'sticky', top: '0' }}>
                                                <tr>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Date</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Invoice</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Method</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Collected By</th>
                                                    <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '13px', color: '#666', fontWeight: '600', borderBottom: '1px solid #eee' }}>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {settlementHistory.map((h, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#333' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Calendar size={14} color="#999" />
                                                                {formatDate(h.settlement_date)}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#333' }}>{h.invoice_number}</td>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#333' }}>{h.payment_method}</td>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#333' }}>{h.collected_by_name}</td>
                                                        <td style={{ padding: '12px 15px', fontSize: '14px', color: '#101540', fontWeight: '600', textAlign: 'right' }}>Rs. {parseFloat(h.amount).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {settlementHistory.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>
                                                            No past settlements found for this dealer.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                                    <button onClick={() => setShowHistoryModal(false)}
                                        style={{ backgroundColor: 'transparent', color: '#666', border: '2px solid #ddd', padding: '12px 60px', borderRadius: '30px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        Close
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
