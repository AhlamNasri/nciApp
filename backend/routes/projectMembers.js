const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Get all members of a project
 * GET /api/projects/:id/members
 */
router.get('/projects/:id/members', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        pm.id as member_id,
        pm.joined_at as joined_at,
        u.id as user_id,
        u.name,
        u.email,
        u.avatar_url as avatar
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.joined_at ASC
    `;

    const [members] = await db.query(query, [id]);

    // Format members with fallback avatar
    const formattedMembers = members.map(member => ({
      id: member.member_id,
      userId: member.user_id,
      name: member.name,
      email: member.email,
      role: 'member', // Default role since column doesn't exist
      joinedAt: member.joined_at,
      avatar: member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`
    }));

    res.json({
      success: true,
      data: formattedMembers
    });
  } catch (err) {
    console.error('Error fetching project members:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project members',
      message: err.message
    });
  }
});

/**
 * Add member by EMAIL
 * POST /api/projects/:id/members
 */
router.post('/projects/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    console.log('Adding member:', { projectId: id, email });

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Step 1: Find user by email
    const [users] = await db.query(
      `SELECT id, name, email, avatar_url FROM users WHERE email = ?`,
      [email]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User with this email not found. Please ask them to register first.'
      });
    }

    const user = users[0];
    console.log('Found user:', user);

    // Step 2: Check if already a member
    const [existing] = await db.query(
      `SELECT * FROM project_members
       WHERE project_id = ? AND user_id = ?`,
      [id, user.id]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member of this project'
      });
    }

    // Step 3: Verify project exists
    const [projects] = await db.query(
      `SELECT id FROM projects WHERE id = ?`,
      [id]
    );

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Step 4: Add member (FIXED - removed 'role' column)
    const [result] = await db.query(
      `INSERT INTO project_members (project_id, user_id)
       VALUES (?, ?)`,
      [id, user.id]
    );

    console.log('Member added successfully:', result.insertId);

    // Return the newly added member
    res.json({
      success: true,
      message: 'Member added successfully',
      data: {
        id: result.insertId,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: 'member',
        avatar: user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`
      }
    });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to add member',
      message: err.message
    });
  }
});

/**
 * Remove member by member ID
 * DELETE /api/projects/:projectId/members/:memberId
 */
router.delete('/projects/:projectId/members/:memberId', async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    console.log('Removing member:', { projectId, memberId });

    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Member ID is required'
      });
    }

    // Check if member exists
    const [existing] = await db.query(
      `SELECT * FROM project_members
       WHERE id = ? AND project_id = ?`,
      [memberId, projectId]
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Member not found in this project'
      });
    }

    // Don't allow removing the project creator
    const [project] = await db.query(
      `SELECT creator_id FROM projects WHERE id = ?`,
      [projectId]
    );

    if (project.length > 0 && existing[0].user_id === project[0].creator_id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove the project creator'
      });
    }

    // Remove the member
    const [result] = await db.query(
      `DELETE FROM project_members
       WHERE id = ? AND project_id = ?`,
      [memberId, projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Failed to remove member'
      });
    }

    console.log('Member removed successfully');

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to remove member',
      message: err.message
    });
  }
});

module.exports = router;