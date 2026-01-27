import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { validatePassword, getPasswordErrors } from '../utils/passwordValidator';
import Sidebar from '../components/Sidebar';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/Dashboard.css';
import '../styles/AccountSettings.css';

const AccountSettings = () => {
    const { user, updateProfile, isAdmin } = useAuth();

    // Profile State
    const [profileData, setProfileData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone_number: user?.phone_number || '',
        username: user?.username || ''
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
    const [passwordValidation, setPasswordValidation] = useState(null);
    const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData({ ...passwordData, [name]: value });

        // Validate new password in real-time
        if (name === 'newPassword') {
            const validation = validatePassword(value);
            setPasswordValidation(validation);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileMessage({ type: '', text: '' });

        try {
            await authApi.updateProfile(profileData);
            updateProfile(profileData);
            setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err) {
            setProfileMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
        } finally {
            setProfileLoading(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        // Validate password requirements
        const validation = validatePassword(passwordData.newPassword);
        if (!validation.isValid) {
            const errors = getPasswordErrors(validation.requirements);
            setPasswordMessage({ type: 'error', text: 'Password must contain: ' + errors.join(', ') });
            return;
        }

        setPasswordLoading(true);

        try {
            await authApi.updatePassword(passwordData.currentPassword, passwordData.newPassword);
            setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordValidation(null);
        } catch (err) {
            setPasswordMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' });
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <>
            {isAdmin ? <AdminSidebar /> : <Sidebar />}
            <div className="dashboard-container">
                <main className="settings-main">
                    <div className="settings-header">
                        <h1 className="header-title">Account Settings</h1>
                        <p className="header-subtitle">Update your personal information and security settings.</p>
                    </div>

                    <div className="settings-grid">
                        {/* Profile Section */}
                        <div className="settings-card">
                            <h2>Personal Information</h2>

                            {profileMessage.text && (
                                <div className={`message ${profileMessage.type}`}>
                                    {profileMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleProfileSubmit} className="settings-form">
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        className="form-input"
                                        value={profileData.username}
                                        onChange={handleProfileChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        className="form-input"
                                        value={profileData.full_name}
                                        onChange={handleProfileChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className="form-input read-only"
                                        value={profileData.email}
                                        onChange={handleProfileChange}
                                        readOnly
                                        required
                                    />
                                    <small className="form-hint">Email address cannot be changed.</small>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        name="phone_number"
                                        className="form-input"
                                        value={profileData.phone_number}
                                        onChange={handleProfileChange}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="save-btn"
                                    disabled={profileLoading}
                                >
                                    {profileLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </form>
                        </div>

                        {/* Password Section */}
                        <div className="settings-card">
                            <h2>Change Password</h2>

                            {passwordMessage.text && (
                                <div className={`message ${passwordMessage.type}`}>
                                    {passwordMessage.text}
                                </div>
                            )}

                            <form onSubmit={handlePasswordSubmit} className="settings-form">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        className="form-input"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        className="form-input"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                    {passwordData.newPassword && passwordValidation && (
                                        <div className={`password-validation ${!passwordValidation.isValid ? 'show-details' : 'compact'}`}>
                                            <div 
                                                className={`password-strength strength-${passwordValidation.strength}`}
                                                role="button"
                                                tabIndex="0"
                                                onClick={() => setShowPasswordRequirements(!showPasswordRequirements)}
                                            >
                                                <span className="strength-text">Strength: <strong>{passwordValidation.strength}</strong></span>
                                                <span className="toggle-icon">{showPasswordRequirements ? '▼' : '▶'}</span>
                                            </div>
                                            {showPasswordRequirements && (
                                                <ul className="requirements-list">
                                                    <li className={passwordValidation.requirements.minLength ? 'met' : 'unmet'}>
                                                        {passwordValidation.requirements.minLength ? '✓' : '✗'} At least 8 characters
                                                    </li>
                                                    <li className={passwordValidation.requirements.hasUppercase ? 'met' : 'unmet'}>
                                                        {passwordValidation.requirements.hasUppercase ? '✓' : '✗'} Uppercase (A-Z)
                                                    </li>
                                                    <li className={passwordValidation.requirements.hasLowercase ? 'met' : 'unmet'}>
                                                        {passwordValidation.requirements.hasLowercase ? '✓' : '✗'} Lowercase (a-z)
                                                    </li>
                                                    <li className={passwordValidation.requirements.hasNumber ? 'met' : 'unmet'}>
                                                        {passwordValidation.requirements.hasNumber ? '✓' : '✗'} Number (0-9)
                                                    </li>
                                                    <li className={passwordValidation.requirements.hasSpecialChar ? 'met' : 'unmet'}>
                                                        {passwordValidation.requirements.hasSpecialChar ? '✓' : '✗'} Special char (!@#...)
                                                    </li>
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        className="form-input"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="password-btn"
                                    disabled={passwordLoading}
                                >
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default AccountSettings;
