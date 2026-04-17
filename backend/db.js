// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');
// Use createPool instead of createConnection (better for multiple requests)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection immediately
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log(' Connected to MySQL database:', process.env.DB_NAME);
        connection.release();
    } catch (err) {
        console.error('DB connection error:', err.message);
    }
})();

module.exports = pool;