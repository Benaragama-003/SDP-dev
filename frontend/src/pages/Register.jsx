import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validatePassword, getPasswordErrors } from '../utils/passwordValidator';
import '../styles/Register.css';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [passwordValidation, setPasswordValidation] = useState(null);
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        setError('');

        // Validate password in real-time
        if (name === 'password') {
            const validation = validatePassword(value);
            setPasswordValidation(validation);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('All fields are required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        // Validate password requirements
        const validation = validatePassword(formData.password);
        if (!validation.isValid) {
            const errors = getPasswordErrors(validation.requirements);
            setError('Password must contain: ' + errors.join(', '));
            return;
        }

        setLoading(true);

        try {
            await register(
                formData.name,
                formData.username,
                formData.email,
                formData.password,
                formData.phone_number
            );
            navigate('/login', { state: { message: 'Registration successful! Your account is pending admin activation. Please wait before logging in.' } });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-page">
            <div className="register-card">
                <div className="register-content">
                    <div className="brand-section">
                        <h1 className="brand-title">Hidellana Distributors</h1>
                    </div>

                    <h2 className="register-heading">Create Supervisor Account</h2>
                    <p className="register-subheading">Register to access the DMS.</p>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form className="register-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Full Name*</label>
                            <input
                                type="text"
                                name="name"
                                className="form-input"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Username*</label>
                            <input
                                type="text"
                                name="username"
                                className="form-input"
                                placeholder="Choose a username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email*</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="text"
                                name="phone_number"
                                className="form-input"
                                placeholder="Enter your 10-digit phone number"
                                value={formData.phone_number}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password*</label>
                            <input
                                type="password"
                                name="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setShowPasswordRequirements(true)}
                                onBlur={() => setShowPasswordRequirements(false)}
                                required
                            />
                            {formData.password && passwordValidation && (
                                <div className="password-validation">
                                    <div className={`password-strength strength-${passwordValidation.strength}`}>
                                        Strength: <span>{passwordValidation.strength}</span>
                                    </div>
                                    <ul className="requirements-list">
                                        <li className={passwordValidation.requirements.minLength ? 'met' : 'unmet'}>
                                            {passwordValidation.requirements.minLength ? '✓' : '✗'} At least 8 characters
                                        </li>
                                        <li className={passwordValidation.requirements.hasUppercase ? 'met' : 'unmet'}>
                                            {passwordValidation.requirements.hasUppercase ? '✓' : '✗'} One uppercase letter (A-Z)
                                        </li>
                                        <li className={passwordValidation.requirements.hasLowercase ? 'met' : 'unmet'}>
                                            {passwordValidation.requirements.hasLowercase ? '✓' : '✗'} One lowercase letter (a-z)
                                        </li>
                                        <li className={passwordValidation.requirements.hasNumber ? 'met' : 'unmet'}>
                                            {passwordValidation.requirements.hasNumber ? '✓' : '✗'} One number (0-9)
                                        </li>
                                        <li className={passwordValidation.requirements.hasSpecialChar ? 'met' : 'unmet'}>
                                            {passwordValidation.requirements.hasSpecialChar ? '✓' : '✗'} One special character (!@#$%^&*...)
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password*</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                className="form-input"
                                placeholder="Confirm your password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <button type="submit" className="register-button" disabled={loading}>
                            {loading ? 'Registering...' : 'Register'}
                        </button>
                    </form>

                    <div className="login-link">
                        Already have an account? <Link to="/login">Login here</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
