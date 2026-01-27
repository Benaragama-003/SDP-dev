import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import '../styles/Dispatch.css';

const SupervisorDispatchView = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');

    const [dispatches, setDispatches] = useState([
        {
            id: 'D001',
            date: new Date().toISOString().split('T')[0],
            lorry: 'CAA-1234',
            supervisor: user?.name || 'John Supervisor',
            route: 'Route A',
            status: 'in-progress',
            progress: {
                '2kg': { loaded: 50, sold: 20, damage: 0, balance: 30 },
                '5kg': { loaded: 110, sold: 50, damage: 0, balance: 60 },
                '12.5kg': { loaded: 140, sold: 100, damage: 0, balance: 40 },
                '37.5kg': { loaded: 0, sold: 0, damage: 0, balance: 0 }
            }
        },
        {
            id: 'D002',
            date: new Date().toISOString().split('T')[0],
            lorry: 'CAB-5678',
            supervisor: user?.name || 'John Supervisor',
            route: 'Route B',
            status: 'scheduled',
            progress: {
                '2kg': { loaded: 100, sold: 0, damage: 0, balance: 100 },
                '5kg': { loaded: 80, sold: 0, damage: 0, balance: 80 },
                '12.5kg': { loaded: 150, sold: 0, damage: 0, balance: 150 },
                '37.5kg': { loaded: 10, sold: 0, damage: 0, balance: 10 }
            }
        }
    ]);

    const handleStartDispatch = (dispatchId) => {
        setDispatches(prev => prev.map(d =>
            d.id === dispatchId ? { ...d, status: 'in-progress' } : d
        ));
        alert("Trip started! Status updated to 'In Progress'.");
    };

    const [selectedDispatch, setSelectedDispatch] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);

    const filtered = dispatches.filter(d =>
        d.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleMarkComplete = (dispatch) => {
        setSelectedDispatch(dispatch);
        setIsConfirmingCompletion(true);
        setShowProgressModal(true);
    };

    const confirmCompletion = () => {
        setDispatches(prev => prev.map(d =>
            d.id === selectedDispatch.id ? { ...d, status: 'awaiting-unload' } : d
        ));
        setShowProgressModal(false);
        setIsConfirmingCompletion(false);
        alert('Dispatch operation marked as completed successfully!');
    };

    return (
        <>
            <Sidebar />
            <div className="dispatch-container">
                <main className="dispatch-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">My Dispatch History</h1>
                            <p className="page-subtitle">Monitor my recent dispatch operations and progress</p>
                        </div>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">Recent Dispatches</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search by ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Dispatch ID</th>
                                        <th>Date</th>
                                        <th>Lorry</th>
                                        <th>Route</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((dispatch) => (
                                        <tr key={dispatch.id}>
                                            <td style={{ fontWeight: '600' }}>{dispatch.id}</td>
                                            <td>{formatDate(dispatch.date)}</td>
                                            <td>{dispatch.lorry}</td>
                                            <td>{dispatch.route}</td>
                                            <td>
                                                <span className={`badge ${dispatch.status === 'unloaded' ? 'badge-success' :
                                                    dispatch.status === 'awaiting-unload' ? 'badge-info' :
                                                        dispatch.status === 'in-progress' ? 'badge-warning' : 'badge-secondary'
                                                    }`}>
                                                    {dispatch.status.replace('-', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}
                                                        onClick={() => { setSelectedDispatch(dispatch); setIsConfirmingCompletion(false); setShowProgressModal(true); }}
                                                    >
                                                        <Eye size={14} /> View Progress
                                                    </button>

                                                    {dispatch.status === 'scheduled' && (
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                                                            onClick={() => handleStartDispatch(dispatch.id)}
                                                        >
                                                            Start Dispatch
                                                        </button>
                                                    )}

                                                    {dispatch.status === 'in-progress' && (
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ backgroundColor: '#43e97b', color: '#101540', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}
                                                            onClick={() => handleMarkComplete(dispatch)}
                                                        >
                                                            Complete Trip
                                                        </button>
                                                    )}

                                                    {dispatch.status === 'awaiting-unload' && (
                                                        <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>Pending Admin Unload</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>

                {showProgressModal && selectedDispatch && (
                    <div className="modal-overlay" onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); }}>
                        <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '600px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>
                                        {isConfirmingCompletion ? 'Confirm Completion' : 'Dispatch Progress'}
                                    </h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>{selectedDispatch.lorry} • {selectedDispatch.route}</p>
                                </div>
                                <button className="modal-close" onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); }} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                {isConfirmingCompletion && (
                                    <div style={{ backgroundColor: '#fff8e1', padding: '15px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #ffe082' }}>
                                        <div style={{ fontSize: '24px' }}>⚠️</div>
                                        <div>
                                            <p style={{ margin: '0', fontWeight: 'bold', color: '#856404' }}>Review before finalizing</p>
                                            <p style={{ margin: '0', fontSize: '13px', color: '#856404' }}>Once marked as completed, you won't be able to edit this dispatch status.</p>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: '15px', padding: '0 0 15px', borderBottom: '2px solid #f5f5f5', marginBottom: '20px', textAlign: 'center', color: '#999', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <div></div>
                                    <div>2kg</div>
                                    <div>5kg</div>
                                    <div>12.5kg</div>
                                    <div>37.5kg</div>
                                </div>

                                {['loaded', 'sold', 'damage', 'balance'].map((type) => (
                                    <div key={type} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                                        <div style={{ color: '#333', fontSize: '15px', fontWeight: '600', textAlign: 'right', paddingRight: '15px' }}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)} Qty
                                        </div>
                                        {['2kg', '5kg', '12.5kg', '37.5kg'].map((size) => (
                                            <div key={size} style={{
                                                backgroundColor: type === 'balance' ? '#f0f4ff' : type === 'damage' ? '#fff5f5' : '#fff',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: type === 'balance' ? '#101540' : type === 'damage' ? '#dc3545' : '#555',
                                                border: '1px solid #eee'
                                            }}>
                                                {type === 'damage' ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={selectedDispatch.progress[size][type]}
                                                        style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'center', fontWeight: 'inherit', color: 'inherit' }}
                                                        onBlur={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            // Logic for damage replacement: balance = loaded - sold - damage (but replacement means sold stays same?)
                                                            // Actually, user said: "if a damage was found... he should replace that to a filled one... thats why"
                                                            // So if 1 damage is found, it's 1 cylinder removed from 'loaded' but replaced (so net loaded unchanged, but damage logged).
                                                            console.log(`Damage for ${size} updated to ${val}`);
                                                        }}
                                                    />
                                                ) : selectedDispatch.progress[size][type]}
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                                    <button
                                        onClick={() => { setShowProgressModal(false); setIsConfirmingCompletion(false); }}
                                        style={{ flex: 1, backgroundColor: '#dc3545', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '16px', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                                    >
                                        {isConfirmingCompletion ? 'Cancel' : 'Close'}
                                    </button>
                                    {isConfirmingCompletion && (
                                        <button
                                            onClick={confirmCompletion}
                                            style={{ flex: 1, backgroundColor: '#43e97b', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '16px', color: '#101540', cursor: 'pointer', fontWeight: '500' }}
                                        >
                                            Confirm & Finish
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default SupervisorDispatchView;
