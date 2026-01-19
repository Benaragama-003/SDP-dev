import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Calendar, MapPin, Eye, Package } from 'lucide-react';
import '../../styles/Dispatch.css';

const DispatchView = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const dispatches = [
        {
            id: 'D001',
            date: '2026-01-15',
            lorry: 'CAA-1234',
            supervisor: 'John Supervisor',
            route: 'Route A',
            status: 'completed',
            progress: {
                '5kg': { loaded: 110, sold: 50, balance: 60 },
                '12.5kg': { loaded: 140, sold: 100, balance: 40 },
                '37.5kg': { loaded: 0, sold: 0, balance: 0 }
            }
        },
        {
            id: 'D002',
            date: '2026-01-15',
            lorry: 'CAB-5678',
            supervisor: 'Jane Smith',
            route: 'Route B',
            status: 'in-progress',
            progress: {
                '5kg': { loaded: 80, sold: 30, balance: 50 },
                '12.5kg': { loaded: 100, sold: 60, balance: 40 },
                '37.5kg': { loaded: 20, sold: 5, balance: 15 }
            }
        },
        {
            id: 'D003',
            date: '2026-01-14',
            lorry: 'CAC-9012',
            supervisor: 'Mike Johnson',
            route: 'Route C',
            status: 'completed',
            progress: {
                '5kg': { loaded: 150, sold: 150, balance: 0 },
                '12.5kg': { loaded: 200, sold: 200, balance: 0 },
                '37.5kg': { loaded: 40, sold: 40, balance: 0 }
            }
        },
    ];

    const [selectedDispatch, setSelectedDispatch] = useState(null);
    const [showProgressModal, setShowProgressModal] = useState(false);

    const filtered = dispatches.filter(d =>
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.supervisor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <AdminSidebar />
            <div className="dispatch-container">
                <main className="dispatch-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Dispatch History</h1>
                            <p className="page-subtitle">View and monitor all dispatch operations</p>
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
                                    placeholder="Search by ID or Supervisor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Dispatch ID</th>
                                    <th>Date</th>
                                    <th>Lorry</th>
                                    <th>Supervisor</th>
                                    <th>Route</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((dispatch) => (
                                    <tr key={dispatch.id}>
                                        <td style={{ fontWeight: '600' }}>{dispatch.id}</td>
                                        <td>{dispatch.date}</td>
                                        <td>{dispatch.lorry}</td>
                                        <td>{dispatch.supervisor}</td>
                                        <td>{dispatch.route}</td>
                                        <td>
                                            <span className={`badge ${dispatch.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                                                {dispatch.status.charAt(0).toUpperCase() + dispatch.status.slice(1).replace('-', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ backgroundColor: '#101540', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}
                                                    onClick={() => { setSelectedDispatch(dispatch); setShowProgressModal(true); }}
                                                >
                                                    <Eye size={14} /> View Progress
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Harmonized Progress Modal */}
                {showProgressModal && selectedDispatch && (
                    <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
                        <div className="modal-content" style={{ backgroundColor: '#fff', borderRadius: '25px', maxWidth: '600px', padding: '0', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ padding: '25px 30px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0', color: '#101540' }}>Dispatch Progress</h1>
                                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>{selectedDispatch.lorry} • {selectedDispatch.route}</p>
                                </div>
                                <button className="modal-close" onClick={() => setShowProgressModal(false)} style={{ fontSize: '28px', border: 'none', background: 'none', cursor: 'pointer', color: '#ccc' }}>×</button>
                            </div>

                            <div style={{ padding: '30px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '15px', padding: '0 0 15px', borderBottom: '2px solid #f5f5f5', marginBottom: '20px', textAlign: 'center', color: '#999', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    <div></div>
                                    <div>5kg</div>
                                    <div>12.5kg</div>
                                    <div>37.5kg</div>
                                </div>

                                {['loaded', 'sold', 'balance'].map((type) => (
                                    <div key={type} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                                        <div style={{ color: '#333', fontSize: '15px', fontWeight: '600', textAlign: 'right', paddingRight: '15px' }}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)} Qty
                                        </div>
                                        {['5kg', '12.5kg', '37.5kg'].map((size) => (
                                            <div key={size} style={{
                                                backgroundColor: type === 'balance' ? '#f0f4ff' : '#fff',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                textAlign: 'center',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: type === 'balance' ? '#101540' : '#555',
                                                border: '1px solid #eee'
                                            }}>
                                                {selectedDispatch.progress[size][type]}
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                <div style={{ marginTop: '40px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => setShowProgressModal(false)}
                                        style={{ backgroundColor: '#dc3545', border: 'none', padding: '15px 80px', borderRadius: '35px', fontSize: '18px', color: 'white', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 10px rgba(220, 53, 69, 0.3)' }}
                                    >
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

export default DispatchView;
