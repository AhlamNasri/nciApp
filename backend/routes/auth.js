// routes/auth.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

router.post('/login', async (req, res) => {
  try {
    const { company_id, password } = req.body;

    if (!company_id || !password) {
      return res.status(400).json({ message: 'Company ID and password are required' });
    }

    const [users] = await pool.query(
      `SELECT id, name, email, avatar_url, company_id, phone_number,
              created_at, updated_at, role_id, password
       FROM users WHERE company_id = ?`,
      [company_id]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid company ID or password' });
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid company ID or password' });
    }

    const token = jwt.sign(
      { userId: user.id, companyId: user.company_id, roleId: user.role_id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    delete user.password;

    res.json({ message: 'Login successful', token, user });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(403).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.companyId = decoded.companyId;
    req.roleId = decoded.roleId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

router.get('/me', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT id, name, email, avatar_url, company_id, phone_number,
              created_at, updated_at, role_id
       FROM users WHERE id = ?`,
      [req.userId]
    );
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

module.exports = router;