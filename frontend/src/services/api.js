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

export default api;
