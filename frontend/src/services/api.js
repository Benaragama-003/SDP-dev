import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to include the JWT token in all requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('dms_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Unauthorized - token might be expired or invalid
            localStorage.removeItem('dms_token');
            localStorage.removeItem('dms_user');
            // We can't use navigate here since it's not a component
            // but the AuthContext will handle state changes
        }
        return Promise.reject(error);
    }
);

// Auth API methods
export const authApi = {
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
    updateProfile: (data) => api.put('/auth/profile', data),
    updatePassword: (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword }),
};

// Dealer API methods
export const dealerApi = {
    // Get all dealers with optional search parameter
    getAllDealers: (search = '') => api.get(`/dealers${search ? `?search=${search}` : ''}`),

    // Get dealer by ID
    getDealerById: (id) => api.get(`/dealers/${id}`),

    // Get dealer statistics (for dashboard)
    getDealerStats: () => api.get('/dealers/stats'),

    // Create new dealer
    createDealer: (dealerData) => api.post('/dealers', dealerData),

    // Update existing dealer
    updateDealer: (id, dealerData) => api.put(`/dealers/${id}`, dealerData),

    // Delete dealer (soft delete - sets status to INACTIVE)
    deleteDealer: (id) => api.delete(`/dealers/${id}`),
};

export default api;
