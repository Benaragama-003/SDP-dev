import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f8f9fa'
        }}>
            <ShieldAlert size={100} color="#dc3545" style={{ marginBottom: '20px' }} />
            <h1 style={{ color: '#333', marginBottom: '10px' }}>403 - Unauthorized Access</h1>
            <p style={{ color: '#666', marginBottom: '30px', textAlign: 'center', maxWidth: '400px' }}>
                You do not have the required permissions to access this page.
                Please contact the administrator or login with a different account.
            </p>
            <button
                onClick={() => navigate('/dashboard')}
                style={{
                    padding: '12px 30px',
                    backgroundColor: '#101540',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                }}
            >
                Back to Dashboard
            </button>
        </div>
    );
};

export default Unauthorized;
