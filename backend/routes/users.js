const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for avatars
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

/**
 * Get user profile with avatar
 * GET /api/users/:userId
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [results] = await db.query(
      'SELECT id, name, email, avatar_url, role_id FROM users WHERE id = ?',
      [userId]
    );

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = results[0];

    // Build full avatar URL
    let avatarUrl;
    if (user.avatar_url) {
      // If it's a relative path, make it absolute
      avatarUrl = user.avatar_url.startsWith('http')
        ? user.avatar_url
        : `http://localhost:5000${user.avatar_url}`;
    } else {
      // Default avatar
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: avatarUrl,
        roleId: user.role_id
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

/**
 * Upload user avatar
 * POST /api/users/:userId/avatar
 */
router.post('/users/:userId/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Return the URL path to the uploaded avatar
    const avatarUrl = `/uploads/${req.file.filename}`;

    // Update user's avatar_url in database
    const [result] = await db.query(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [avatarUrl, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      avatarUrl: avatarUrl,
      message: 'Avatar updated successfully'
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ success: false, error: 'Failed to upload avatar' });
  }
});

/**
 * Delete user avatar
 * DELETE /api/users/:userId/avatar
 */
router.delete('/users/:userId/avatar', async (req, res) => {
  try {
    const { userId } = req.params;

    // Set avatar_url to NULL in database
    const [result] = await db.query(
      'UPDATE users SET avatar_url = NULL WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar removed successfully'
    });
  } catch (error) {
    console.error('Error removing avatar:', error);
    res.status(500).json({ success: false, error: 'Failed to remove avatar' });
  }
});

/**
 * Change user password
 * POST /api/users/:userId/change-password
 * Handles both plain text and hashed passwords
 */
router.post('/users/:userId/change-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Get current password from database
    const [users] = await db.query(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[0];

    // Check if password is hashed or plain text
    const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');

    let isPasswordValid;

    if (isHashed) {
      // Password is hashed - use bcrypt
      try {
        const bcrypt = require('bcrypt');
        isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      } catch (err) {
        console.error('Bcrypt comparison error:', err);
        return res.status(500).json({
          success: false,
          error: 'Password verification failed'
        });
      }
    } else {
      // Password is plain text - direct comparison
      isPasswordValid = currentPassword === user.password;
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    let hashedNewPassword;
    try {
      const bcrypt = require('bcrypt');
      hashedNewPassword = await bcrypt.hash(newPassword, 10);
    } catch (err) {
      console.error('Bcrypt hashing error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to hash new password'
      });
    }

    // Update password in database
    const [result] = await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

/**
 * Search users by email or name
 * GET /api/users/search?query=...
 */
router.get('/users/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const searchQuery = `
      SELECT id, name, email, avatar_url
      FROM users
      WHERE email LIKE ? OR name LIKE ?
      LIMIT 10
    `;

    const searchPattern = `%${query}%`;
    const [results] = await db.query(searchQuery, [searchPattern, searchPattern]);

    // Format results with avatar fallback
    const users = results.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_url
        ? (user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:5000${user.avatar_url}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

/**
 * Get all users (optional - for admin purposes)
 * GET /api/users
 */
router.get('/users', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT id, name, email, avatar_url, role_id, created_at FROM users ORDER BY created_at DESC'
    );

    const users = results.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar_url
        ? (user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:5000${user.avatar_url}`)
        : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
      roleId: user.role_id,
      createdAt: user.created_at
    }));

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * Update user profile
 * PATCH /api/users/:userId
 */
router.patch('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(userId);

    const [result] = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

/**
 * Delete user account
 * DELETE /api/users/:userId
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // First, delete related records (project_members, messages, etc.)
    await db.query('DELETE FROM project_members WHERE user_id = ?', [userId]);
    await db.query('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);

    // Delete the user
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user account'
    });
  }
});

module.exports = router;