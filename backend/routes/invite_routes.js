/**
 * Add these routes to your existing projects.js file
 */

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

module.exports = router;