const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // ✅ Ensure uuid is imported

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'project-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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
 * Helper function to get project members
 */
async function getProjectMembers(projectId) {
  const query = `
    SELECT
      pm.id as member_id,
      pm.user_id,
      u.name,
      u.email,
      u.avatar_url
    FROM project_members pm
    JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `;

  const [members] = await db.query(query, [projectId]);

  return members.map(member => ({
    id: member.member_id,
    userId: member.user_id,
    name: member.name,
    email: member.email,
    avatar: member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`
  }));
}

/**
 * Upload image endpoint
 * POST /api/upload-image
 */
router.post('/upload-image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Return the URL path to the uploaded image
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl: imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ success: false, error: 'Failed to upload image' });
  }
});

/**
 * Get all projects with creator info and members
 * GET /api/projects
 */
router.get('/projects', async (req, res) => {
  try {
    const query = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.image_url as image,
        p.start_date as startDate,
        p.end_date as endDate,
        p.status,
        p.creator_id as creatorId,
        p.invite_code as inviteCode,
        u.id as creator_id,
        u.name as creator_name,
        u.avatar_url as creator_avatar
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
    `;

    const [results] = await db.query(query);

    // Fetch members for each project
    const projects = await Promise.all(results.map(async (project) => {
      const members = await getProjectMembers(project.id);

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        image: project.image,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        creatorId: project.creatorId,
        inviteCode: project.inviteCode,
        creator: {
          id: project.creator_id,
          name: project.creator_name,
          avatar: project.creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${project.creator_name}`
        },
        members: members
      };
    }));

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

/**
 * Get projects by status
 * GET /api/projects/status/:status
 */
router.get('/projects/status/:status', async (req, res) => {
  try {
    const { status } = req.params;

    if (!['ongoing', 'past'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "ongoing" or "past"'
      });
    }

    const query = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.image_url as image,
        p.start_date as startDate,
        p.end_date as endDate,
        p.status,
        p.creator_id as creatorId,
        p.invite_code as inviteCode,
        u.id as creator_id,
        u.name as creator_name,
        u.avatar_url as creator_avatar
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.status = ?
      ORDER BY p.created_at DESC
    `;

    const [results] = await db.query(query, [status]);

    // Fetch members for each project
    const projects = await Promise.all(results.map(async (project) => {
      const members = await getProjectMembers(project.id);

      return {
        id: project.id,
        title: project.title,
        description: project.description,
        image: project.image,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        creatorId: project.creatorId,
        inviteCode: project.inviteCode,
        creator: {
          id: project.creator_id,
          name: project.creator_name,
          avatar: project.creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${project.creator_name}`
        },
        members: members
      };
    }));

    res.json({ success: true, data: projects });
  } catch (error) {
    console.error('Error fetching projects by status:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

/**
 * Get single project by ID
 * GET /api/projects/:id
 */
router.get('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.image_url as image,
        p.start_date as startDate,
        p.end_date as endDate,
        p.status,
        p.creator_id as creatorId,
        p.invite_code as inviteCode,
        u.id as creator_id,
        u.name as creator_name,
        u.avatar_url as creator_avatar
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = ?
    `;

    const [results] = await db.query(query, [id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Fetch members for this project
    const members = await getProjectMembers(id);

    const project = {
      id: results[0].id,
      title: results[0].title,
      description: results[0].description,
      image: results[0].image,
      startDate: results[0].startDate,
      endDate: results[0].endDate,
      status: results[0].status,
      creatorId: results[0].creatorId,
      inviteCode: results[0].inviteCode,
      creator: {
        id: results[0].creator_id,
        name: results[0].creator_name,
        avatar: results[0].creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${results[0].creator_name}`
      },
      members: members
    };

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

/**
 * Get project details by invite code (for join page preview)
 * GET /api/projects/invite/:inviteCode
 */
router.get('/projects/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const query = `
      SELECT
        p.id,
        p.title,
        p.description,
        p.image_url as image,
        p.start_date as startDate,
        p.end_date as endDate,
        p.status,
        p.creator_id as creatorId,
        u.id as creator_id,
        u.name as creator_name,
        u.avatar_url as creator_avatar
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.invite_code = ?
    `;

    const [results] = await db.query(query, [inviteCode]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite link or project not found'
      });
    }

    // Get member count
    const [memberCount] = await db.query(
      'SELECT COUNT(*) as count FROM project_members WHERE project_id = ?',
      [results[0].id]
    );

    const project = {
      id: results[0].id,
      title: results[0].title,
      description: results[0].description,
      image: results[0].image,
      startDate: results[0].startDate,
      endDate: results[0].endDate,
      status: results[0].status,
      creatorId: results[0].creatorId,
      creator: {
        id: results[0].creator_id,
        name: results[0].creator_name,
        avatar: results[0].creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${results[0].creator_name}`
      },
      memberCount: memberCount[0].count
    };

    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Error fetching project by invite code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
});

/**
 * Create new project
 * POST /api/projects
 */
router.post('/projects', async (req, res) => {
  try {
    const { title, description, image, startDate, endDate, creatorId, teamMembers, inviteCode } = req.body;

    if (!title || !startDate || !endDate || !creatorId) {
      return res.status(400).json({
        success: false,
        error: 'Title, start date, end date, and creator ID are required'
      });
    }

    // ✅ ALWAYS generate a unique invite code (use provided one or generate new)
    const finalInviteCode = inviteCode || uuidv4();
    console.log('📌 Generated invite code:', finalInviteCode); // Debug log

    // Verify team members exist if provided
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      const invalidMembers = [];

      for (const member of teamMembers) {
        if (!member.id && !member.email) {
          return res.status(400).json({
            success: false,
            error: 'Each team member must have either an ID or email'
          });
        }

        let userQuery;
        let queryParam;

        if (member.id) {
          userQuery = 'SELECT id, name, email FROM users WHERE id = ?';
          queryParam = member.id;
        } else {
          userQuery = 'SELECT id, name, email FROM users WHERE email = ?';
          queryParam = member.email;
        }

        const [userResults] = await db.query(userQuery, [queryParam]);

        if (userResults.length === 0) {
          invalidMembers.push(member);
        }
      }

      if (invalidMembers.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Some team members do not exist',
          invalidMembers
        });
      }
    }

    // ✅ Insert project WITH invite_code and status
    const query = `
      INSERT INTO projects (title, description, image_url, start_date, end_date, status, creator_id, invite_code)
      VALUES (?, ?, ?, ?, ?, 'ongoing', ?, ?)
    `;

    const [result] = await db.query(query, [
      title,
      description || null,
      image || null,
      startDate,
      endDate,
      creatorId,
      finalInviteCode // ✅ Store the invite code
    ]);

    const projectId = result.insertId;
    console.log('✅ Project created with ID:', projectId, 'Invite Code:', finalInviteCode);

    // ✅ Auto-create chat room for the project
    try {
      await db.query(
        'INSERT INTO chat_rooms (project_id, room_name) VALUES (?, ?)',
        [projectId, `${title} - Team Chat`]
      );
      console.log(`✅ Chat room created for project ${projectId}`);
    } catch (chatError) {
      console.error('⚠️ Error creating chat room:', chatError);
    }

    // Add team members to project_members table
    if (teamMembers && Array.isArray(teamMembers) && teamMembers.length > 0) {
      const memberQuery = `INSERT INTO project_members (project_id, user_id) VALUES (?, ?)`;

      for (const member of teamMembers) {
        try {
          let userId = member.id;

          if (!userId && member.email) {
            const [userResults] = await db.query(
              'SELECT id FROM users WHERE email = ?',
              [member.email]
            );
            userId = userResults[0]?.id;
          }

          if (userId) {
            await db.query(memberQuery, [projectId, userId]);
            console.log(`✅ Added member ${userId} to project ${projectId}`);
          }
        } catch (memberError) {
          console.error(`⚠️ Error adding member ${member.id || member.email}:`, memberError);
        }
      }
    }

    // ✅ Fetch the created project WITH invite_code
    const [newProject] = await db.query(`
      SELECT
        p.id,
        p.title,
        p.description,
        p.image_url as image,
        p.start_date as startDate,
        p.end_date as endDate,
        p.status,
        p.creator_id as creatorId,
        p.invite_code as inviteCode,
        u.id as creator_id,
        u.name as creator_name,
        u.avatar_url as creator_avatar
      FROM projects p
      JOIN users u ON p.creator_id = u.id
      WHERE p.id = ?
    `, [projectId]);

    // Fetch members
    const members = await getProjectMembers(projectId);

    const project = {
      id: newProject[0].id,
      title: newProject[0].title,
      description: newProject[0].description,
      image: newProject[0].image,
      startDate: newProject[0].startDate,
      endDate: newProject[0].endDate,
      status: newProject[0].status,
      creatorId: newProject[0].creatorId,
      inviteCode: newProject[0].inviteCode, // ✅ Include invite code in response
      creator: {
        id: newProject[0].creator_id,
        name: newProject[0].creator_name,
        avatar: newProject[0].creator_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newProject[0].creator_name}`
      },
      members: members
    };

    console.log('✅ Returning project data with invite code:', project.inviteCode);

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    console.error('❌ Error creating project:', error);
    res.status(500).json({ success: false, error: 'Failed to create project', message: error.message });
  }
});

/**
 * Join project using invite code
 * POST /api/projects/join/:inviteCode
 */
router.post('/projects/join/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Find project by invite code
    const [projects] = await db.query(
      `SELECT id, title, creator_id FROM projects WHERE invite_code = ?`,
      [inviteCode]
    );

    if (!projects || projects.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite link or project not found'
      });
    }

    const project = projects[0];

    // Check if user is already a member
    const [existing] = await db.query(
      `SELECT * FROM project_members WHERE project_id = ? AND user_id = ?`,
      [project.id, userId]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You are already a member of this project'
      });
    }

    // Check if user is the creator
    if (project.creator_id === parseInt(userId)) {
      return res.status(400).json({
        success: false,
        error: 'You are the creator of this project'
      });
    }

    // Add user as member
    await db.query(
      `INSERT INTO project_members (project_id, user_id) VALUES (?, ?)`,
      [project.id, userId]
    );

    res.json({
      success: true,
      message: 'Successfully joined the project',
      data: {
        projectId: project.id,
        projectTitle: project.title
      }
    });
  } catch (err) {
    console.error('Error joining project:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to join project',
      message: err.message
    });
  }
});

/**
 * Update project (general update)
 * PUT /api/projects/:id
 */
router.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      image,
      startDate,
      endDate,
      status
    } = req.body;

    // Validate status if provided
    if (status && !['ongoing', 'past'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "ongoing" or "past"'
      });
    }

    const query = `
      UPDATE projects
      SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        status = COALESCE(?, status)
      WHERE id = ?
    `;

    const [result] = await db.query(query, [
      title || null,
      description || null,
      image || null,
      startDate || null,
      endDate || null,
      status || null,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

/**
 * Update project status
 * PATCH /api/projects/:id/status
 */
router.patch('/projects/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    if (!['ongoing', 'past'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "ongoing" or "past"'
      });
    }

    const query = `UPDATE projects SET status = ? WHERE id = ?`;
    const [result] = await db.query(query, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project status updated successfully'
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project status'
    });
  }
});

/**
 * Update project description
 * PATCH /api/projects/:id/description
 */
router.patch('/projects/:id/description', async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (description === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }

    const [result] = await db.query(
      `UPDATE projects SET description = ? WHERE id = ?`,
      [description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Description updated successfully',
      data: { description }
    });
  } catch (err) {
    console.error('Error updating description:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update description',
      message: err.message
    });
  }
});

/**
 * Delete project
 * DELETE /api/projects/:id
 */
router.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First delete all project members (foreign key constraint)
    await db.query('DELETE FROM project_members WHERE project_id = ?', [id]);

    // Then delete the project
    const query = `DELETE FROM projects WHERE id = ?`;
    const [result] = await db.query(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
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

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search users'
    });
  }
});

/**
 * Get unread messages count
 * GET /api/messages/unread/count?userId=...
 */
router.get('/messages/unread/count', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const query = `
      SELECT COUNT(*) as count
      FROM messages
      WHERE receiver_id = ? AND is_read = FALSE
    `;

    const [results] = await db.query(query, [userId]);

    res.json({
      success: true,
      count: results[0].count
    });
  } catch (error) {
    console.error('Error fetching unread messages count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unread messages count'
    });
  }
});

module.exports = router;