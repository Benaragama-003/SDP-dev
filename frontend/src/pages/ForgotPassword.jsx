import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import '../styles/Login.css'; // Reuse login styles

const ForgotPassword = () => {
    const location = useLocation();
    const passedCredential = location.state?.credential || '';

    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEmailLocked, setIsEmailLocked] = useState(false);

    useEffect(() => {
        const fetchEmail = async () => {
            if (passedCredential) {
                console.log('Attempting to fetch email for:', passedCredential);
                // If the user entered an email on the login screen, we can use it directly
                if (passedCredential.includes('@')) {
                    console.log('Credential is an email, skipping fetch');
                    setEmail(passedCredential);
                    setIsEmailLocked(true);
                } else {
                    // It was a username, we need to fetch the email over the new API
                    try {
                        const response = await authApi.getEmailForReset(passedCredential);
                        console.log('Email fetch response:', response.data);
                        if (response.data?.data?.email) {
                            console.log('Email found for username:', response.data.data.email);
                            setEmail(response.data.data.email);
                            setIsEmailLocked(true);
                        } else {
                            console.log('No email found for username in response data.');
                        }
                    } catch (err) {
                        console.error('Failed to prefetch email for reset:', err);
                        setError('Could not automatically retrieve the email for this username. Please enter it manually.');
                    }
                }
            } else {
                console.log('No passed credential, email field remains editable.');
            }
        };
        fetchEmail();
    }, [passedCredential]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await authApi.forgotPassword(email);
            setMessage(response.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-content">
                    <div className="brand-section">
                        <h1 className="brand-title">Hidellana Distributors</h1>
                    </div>

                    <h2 className="login-heading">Forgot Password</h2>
                    <p className="login-subheading">Enter your email address and we'll send you a link to reset your password.</p>

                    {message && <div style={{ color: '#28a745', backgroundColor: '#d4edda', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{message}</div>}
                    {error && <div style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address*</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                readOnly={isEmailLocked}
                                style={isEmailLocked ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed', color: '#666' } : {}}
                                required
                            />
                        </div>

                        <button type="submit" className="login-button" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="register-link">
                        <Link to="/login">← Back to Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
