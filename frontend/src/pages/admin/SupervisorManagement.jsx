import React, { useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, UserCheck, UserX } from 'lucide-react';
import '../../styles/Dealers.css';

const SupervisorManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const [supervisors, setSupervisors] = useState([
        { id: 'S001', name: 'John Supervisor', email: 'john@hidellana.lk', contact: '0771234567', route: 'Route A', status: 'active' },
        { id: 'S002', name: 'Jane Smith', email: 'jane@hidellana.lk', contact: '0777654321', route: 'Route B', status: 'active' },
        { id: 'S003', name: 'Mike Johnson', email: 'mike@hidellana.lk', contact: '0769876543', route: 'Route C', status: 'active' },
        { id: 'S004', name: 'Sarah Williams', email: 'sarah@hidellana.lk', contact: '0775432167', route: 'Route A', status: 'inactive' },
    ]);

    const filtered = supervisors.filter((sup) =>
        sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sup.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleStatus = (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setSupervisors(supervisors.map(sup =>
            sup.id === id ? { ...sup, status: newStatus } : sup
        ));
        // alert(`Supervisor status updated to ${newStatus}!`); 
    };

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Supervisor Management</h1>
                            <p className="page-subtitle">Manage supervisor accounts and permissions</p>
                        </div>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Supervisors</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search supervisors..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Supervisor ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Contact</th>
                                    <th>Assigned Route</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((sup) => (
                                    <tr key={sup.id}>
                                        <td>{sup.id}</td>
                                        <td>{sup.name}</td>
                                        <td>{sup.email}</td>
                                        <td>{sup.contact}</td>
                                        <td>{sup.route}</td>
                                        <td>
                                            <span className={`badge ${sup.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {sup.status.charAt(0).toUpperCase() + sup.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions-cell">
                                                <button
                                                    className={`action-btn ${sup.status === 'active' ? 'action-btn-delete' : 'action-btn-edit'}`}
                                                    onClick={() => toggleStatus(sup.id, sup.status)}
                                                >
                                                    {sup.status === 'active' ? <><UserX size={16} /> Deactivate</> : <><UserCheck size={16} /> Activate</>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </>
    );
};

export default SupervisorManagement;
