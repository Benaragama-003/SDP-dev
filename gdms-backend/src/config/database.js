const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  idleTimeout: 60000,        // close idle connections after 60s (Azure MySQL closes at ~600s)
  ...(process.env.NODE_ENV === 'production' && {
    ssl: { rejectUnauthorized: false }
  })
};


let pool = null;
let keepAliveInterval = null;

const getConnection = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
      // Test the connection
      const connection = await pool.getConnection();
      console.log('Database connection established');
      connection.release();

      // Keep-alive ping every 4 minutes to prevent Azure MySQL from closing idle connections
      if (!keepAliveInterval) {
        keepAliveInterval = setInterval(async () => {
          try {
            await pool.query('SELECT 1');
          } catch (err) {
            console.warn('Keep-alive ping failed:', err.message);
          }
        }, 4 * 60 * 1000); // 4 minutes
      }
    }
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

const closeConnection = async () => {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error closing database connection:', error.message);
    throw error;
  }
};

// Helper function to execute queries
const query = async (sql, params) => {
  const connection = await getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
};

module.exports = {
  getConnection,
  closeConnection,
  query,
};