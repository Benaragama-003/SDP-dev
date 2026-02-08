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

export const dashboardApi = {
    getStats: () => api.get('/dashboard/stats')
};

// Dealer API methods
export const dealerApi = {
    // Get all dealers with optional search parameter
    getAllDealers: (search = '') => api.get(`/dealers${search ? `?search=${search}` : ''}`),

    // Get only active dealers (for invoice creation)
    getActiveDealers: () => api.get('/dealers?status=ACTIVE'),

    // Get dealer by ID
    getDealerById: (id) => api.get(`/dealers/${id}`),

    // Get dealer statistics (for dashboard)
    getDealerStats: () => api.get('/dealers/stats'),

    // Get unique routes for filter dropdown
    getRoutes: () => api.get('/dealers/routes'),

    // Export dealers to Excel (returns blob)
    exportToExcel: (route = 'all') => api.get(`/dealers/export${route !== 'all' ? `?route=${route}` : ''}`, {
        responseType: 'blob'
    }),

    // Create new dealer
    createDealer: (dealerData) => api.post('/dealers', dealerData),

    // Update existing dealer
    updateDealer: (id, dealerData) => api.put(`/dealers/${id}`, dealerData),

    // Toggle dealer status (activate/deactivate)
    toggleDealerStatus: (id) => api.patch(`/dealers/${id}/toggle-status`),

    // Delete dealer (soft delete - sets status to INACTIVE)
    deleteDealer: (id) => api.delete(`/dealers/${id}`),
};

// Product & Inventory API methods
export const productApi = {
    // Get all products
    getAllProducts: () => api.get('/products'),

    // Get inventory summary (role-based: ADMIN sees all, SUPERVISOR sees ACTIVE only)
    getInventorySummary: () => api.get('/products/inventory/summary'),  // ✅ UPDATED

    // Create new product (admin only)
    createProduct: (productData) => api.post('/products', productData),

    // Update product prices (admin only)
    updateProduct: (id, productData) => api.put(`/products/${id}`, productData),

    // Get only ACTIVE products (for dropdowns in Dispatch/Purchase Orders)
    getActiveProducts: () => api.get('/products/active'),

    // Toggle product status (active/inactive)
    toggleProductStatus: (id) => api.patch(`/products/${id}/toggle-status`),

    // Report damage (admin only - warehouse)
    reportDamage: (damageData) => api.post('/products/damage', damageData),

    // Get inventory movements (history)
    getMovements: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/products/movements${queryString ? `?${queryString}` : ''}`);
    },

    // Export inventory to Excel (returns blob)
    exportToExcel: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/products/export${queryString ? `?${queryString}` : ''}`, {
            responseType: 'blob'
        });
    },
};

// Purchase Order API
export const purchaseOrderApi = {
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/purchase-orders${queryString ? `?${queryString}` : ''}`);
    },
    
    getById: (id) => api.get(`/purchase-orders/${id}`),
    
    create: (data) => api.post('/purchase-orders', data),
    
    approve: (id) => api.put(`/purchase-orders/${id}/approve`),
    
    receive: (id, data = {}) => api.put(`/purchase-orders/${id}/receive`, data),
    
    cancel: (id) => api.put(`/purchase-orders/${id}/cancel`),
    
    // Get available empty stock for refill validation
    getEmptyStock: () => api.get('/purchase-orders/empty-stock'),

    // Export purchase orders to Excel (returns blob)
    exportToExcel: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/purchase-orders/export${queryString ? `?${queryString}` : ''}`, {
        responseType: 'blob'
    });
    },
};

// Dispatch API
export const dispatchApi = {
    // Get all dispatches with filters
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/dispatches${queryString ? `?${queryString}` : ''}`);
    },
    
    // Get single dispatch by ID
    getById: (id) => api.get(`/dispatches/${id}`),
    
    // Get available resources (lorries, supervisors, inventory, routes)
    getResources: () => api.get('/dispatches/resources'),
    
    // Create new dispatch
    create: (data) => api.post('/dispatches', data),
    
    // Start dispatch (SCHEDULED -> IN_PROGRESS)
    start: (id) => api.put(`/dispatches/${id}/start`),
    
    // Request unload (supervisor ends day)
    requestUnload: (id) => api.put(`/dispatches/${id}/request-unload`),
    
    // Accept unload (admin returns stock to warehouse)
    acceptUnload: (id, data = {}) => api.put(`/dispatches/${id}/accept-unload`, data),
    
    // Cancel dispatch
    cancel: (id) => api.put(`/dispatches/${id}/cancel`),
    
    // Update progress (sold/damaged)
    updateProgress: (id, data) => api.put(`/dispatches/${id}/progress`, data),
    
    // Get supervisor's active dispatch
    getMyDispatch: () => api.get('/dispatches/my/active'),
};

// Invoice API
export const invoiceApi = {
    // Get all invoices (admin sees all, supervisor sees their own)
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/invoices${queryString ? `?${queryString}` : ''}`);
    },
    
    // Create new invoice (deducts from lorry stock)
    create: (data) => api.post('/invoices', data),
    
    // Report damage during dispatch
    reportDamage: (data) => api.post('/invoices/report-damage', data),
    
    // Download invoice as PDF
    downloadPDF: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
    softDelete: (id) => api.put(`/invoices/${id}/delete`),
    exportToExcel: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/invoices/export${queryString ? `?${queryString}` : ''}`, {
            responseType: 'blob'
        });
    }
};

// Credit API
export const creditApi = {
    // Get all credit accounts with dealer summary
    getAll: () => api.get('/credit'),
    
    // Get credit summary for dashboard
    getSummary: () => api.get('/credit/summary'),
    
    // Get outstanding credits for a specific dealer
    getDealerCredits: (dealerId) => api.get(`/credit/dealer/${dealerId}`),
    
    // Get settlement history for a dealer
    getHistory: (dealerId) => api.get(`/credit/history/${dealerId}`),
    
    // Settle credit (record payment)
    settle: (data) => api.post('/credit/settle', data),
    
    // Update overdue status
    updateOverdue: () => api.post('/credit/update-overdue'),
};

// Sales API
export const salesApi = {
    getMySales: (date) => api.get(`/sales/my-sales${date ? `?date=${date}` : ''}`),
    getAllSales: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return api.get(`/sales/all${queryString ? `?${queryString}` : ''}`);
    },
};

// Cheque API
export const chequeApi = {
    // Get all cheques
    getAll: () => api.get('/cheques'),
    
    // Update cheque status (CLEARED, RETURNED, CANCELLED)
    updateStatus: (chequePaymentId, data) => api.put(`/cheques/${chequePaymentId}/status`, data),
};

// Download PDF
export const downloadPDF = (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });


export default api;
