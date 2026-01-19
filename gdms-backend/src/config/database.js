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
  keepAliveInitialDelay: 0
};

let pool = null;

const getConnection = async () => {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
      // Test the connection
      const connection = await pool.getConnection();
      console.log('✅ Database connection established');
      connection.release();
    }
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
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