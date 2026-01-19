import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/AdminSidebar';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import '../../styles/Dealers.css';

const AdminDealers = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const dealers = [
        { id: 'D001', name: 'ABC Stores', contact: '0771234567', route: 'Route A', creditLimit: 50000, status: 'active' },
        { id: 'D002', name: 'XYZ Mart', contact: '0777654321', route: 'Route B', creditLimit: 75000, status: 'active' },
        { id: 'D003', name: 'LMN Distributors', contact: '0769876543', route: 'Route A', creditLimit: 100000, status: 'active' },
        { id: 'D004', name: 'PQR Suppliers', contact: '0775432167', route: 'Route C', creditLimit: 60000, status: 'inactive' },
    ];

    const filteredDealers = dealers.filter((dealer) =>
        dealer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dealer.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (dealerId) => {
        if (window.confirm('Are you sure you want to delete this dealer?')) {
            console.log('Deleting dealer:', dealerId);
            alert('Dealer deleted successfully!');
        }
    };

    return (
        <>
            <AdminSidebar />
            <div className="dealers-container">
                <main className="dealers-main">
                    <div className="page-header">
                        <div>
                            <h1 className="page-title">Dealers Management</h1>
                            <p className="page-subtitle">Manage dealer network</p>
                        </div>
                        <button className="btn btn-primary" onClick={() => navigate('/admin/dealers/add')}>
                            <Plus size={20} />
                            Add New Dealer
                        </button>
                    </div>

                    <div className="table-container">
                        <div className="table-header">
                            <h3 className="table-title">All Dealers</h3>
                            <div className="search-box">
                                <Search className="search-icon" size={20} />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search dealers..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Dealer ID</th>
                                    <th>Name</th>
                                    <th>Contact</th>
                                    <th>Route</th>
                                    <th>Credit Limit</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDealers.map((dealer) => (
                                    <tr key={dealer.id}>
                                        <td>{dealer.id}</td>
                                        <td>{dealer.name}</td>
                                        <td>{dealer.contact}</td>
                                        <td>{dealer.route}</td>
                                        <td>Rs. {dealer.creditLimit.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${dealer.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                                {dealer.status.charAt(0).toUpperCase() + dealer.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions-cell">
                                                <button className="action-btn action-btn-edit" onClick={() => navigate(`/admin/dealers/update/${dealer.id}`)}>
                                                    <Edit2 size={16} /> Edit
                                                </button>
                                                <button className="action-btn action-btn-delete" onClick={() => handleDelete(dealer.id)}>
                                                    <Trash2 size={16} /> Delete
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

export default AdminDealers;
