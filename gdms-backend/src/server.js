
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();
const { startCreditCronJobs } = require('./cron/creditCron')


const { getConnection } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const productRoutes = require('./routes/productRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const poRoutes = require('./routes/purchaseOrderRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const lorryRoutes = require('./routes/lorryRoutes');
const creditRoutes = require('./routes/creditRoutes');
const chequeRoutes = require('./routes/chequeRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const locationRoutes = require('./routes/locationRoutes');
const salesRoutes = require('./routes/salesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
exports.app = app;
const PORT = process.env.PORT || 5000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  exposedHeaders: ['Content-Disposition']
}));

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'GDMS API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/dealers`, dealerRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/dispatches`, dispatchRoutes);
app.use(`${API_PREFIX}/lorries`, lorryRoutes);
app.use(`${API_PREFIX}/purchase-orders`, poRoutes);
app.use(`${API_PREFIX}/credit`, creditRoutes);
app.use(`${API_PREFIX}/cheques`, chequeRoutes);
app.use(`${API_PREFIX}/location`, locationRoutes);
app.use(`${API_PREFIX}/sales`, salesRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);
// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use(errorHandler);

// Start server — listen FIRST so Azure health probe passes, then connect DB
const startServer = async () => {
  // Start listening immediately so Azure's startup probe gets a response
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Base: http://localhost:${PORT}${API_PREFIX}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Connect to database after server is already listening
  try {
    await getConnection();
    console.log('Database connected successfully');
    startCreditCronJobs();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    console.error('Server is running but database is not connected. Retrying in 10s...');
    // Retry DB connection after 10 seconds
    setTimeout(async () => {
      try {
        await getConnection();
        console.log('Database reconnected successfully');
        startCreditCronJobs();
      } catch (retryError) {
        console.error('Database retry failed:', retryError.message);
      }
    }, 10000);
  }
};

startServer();

module.exports = app;