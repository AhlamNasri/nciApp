const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

/**
 * Upload document with visibility control
 * POST /api/projects/:id/files
 * Body: { title, description, category, uploaded_by, hidden_from_users: [userId1, userId2, ...] }
 */
router.post('/projects/:id/files', upload.single('file'), async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { title, description, category, uploaded_by, hidden_from_users } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Validate uploaded_by is provided
    if (!uploaded_by) {
      // Clean up uploaded file since we can't proceed
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'uploaded_by is required'
      });
    }

    const { originalname, mimetype, path: filePath, size } = req.file;

    // Use provided title or fallback to original filename
    const documentTitle = title || originalname;

    await connection.beginTransaction();

    // Insert document into database
    const [result] = await connection.query(
      `INSERT INTO documents
        (title, description, file_path, file_type, category, project_id, uploaded_by, role_access, is_confidential, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [documentTitle, description || null, filePath, mimetype, category || null, id, uploaded_by, 1, 0]
    );

    const documentId = result.insertId;

    // Parse hidden_from_users if it's a JSON string
    let hiddenFromUsers = [];
    if (hidden_from_users) {
      try {
        hiddenFromUsers = typeof hidden_from_users === 'string'
          ? JSON.parse(hidden_from_users)
          : hidden_from_users;
      } catch (e) {
        console.error('Error parsing hidden_from_users:', e);
      }
    }

    // Insert visibility restrictions if any
    if (Array.isArray(hiddenFromUsers) && hiddenFromUsers.length > 0) {
      const visibilityValues = hiddenFromUsers.map(userId => [documentId, userId]);
      await connection.query(
        `INSERT INTO document_visibility (document_id, hidden_from_user_id) VALUES ?`,
        [visibilityValues]
      );
    }

    await connection.commit();

    console.log('Document uploaded:', {
      id: documentId,
      title: documentTitle,
      path: filePath,
      uploaded_by: uploaded_by,
      hidden_from: hiddenFromUsers
    });

    res.json({
      success: true,
      data: {
        id: documentId,
        title: documentTitle,
        description: description || null,
        file_path: filePath,
        file_type: mimetype,
        category: category || null,
        project_id: id,
        uploaded_by: uploaded_by,
        role_access: 1,
        is_confidential: 0,
        hidden_from_users: hiddenFromUsers
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('File upload error:', err);

    // Clean up file if database insert failed
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up file after error:', req.file.path);
      } catch (cleanupErr) {
        console.error('Error cleaning up file:', cleanupErr);
      }
    }

    res.status(500).json({
      success: false,
      error: 'File upload failed',
      message: err.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Get project documents with visibility filtering
 * GET /api/projects/:id/files?userId=...
 * Returns documents that the user has permission to see
 */
router.get('/projects/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Check if user is a team member or leader for this project
    const [teamMembership] = await db.query(
      `SELECT user_id FROM project_members WHERE project_id = ? AND user_id = ?`,
      [id, userId]
    );

    // Check if user is the project creator
    const [projectInfo] = await db.query(
      `SELECT creator_id FROM projects WHERE id = ?`,
      [id]
    );

    const isProjectCreator = projectInfo.length > 0 && projectInfo[0].creator_id === parseInt(userId);
    const isTeamMember = teamMembership.length > 0 && !isProjectCreator;

    // Get all documents with visibility information
    let query = `
      SELECT
        d.id,
        d.title,
        d.description,
        d.file_path,
        d.file_type,
        d.category,
        d.project_id,
        d.uploaded_by,
        d.role_access,
        d.is_confidential,
        d.created_at,
        d.updated_at,
        GROUP_CONCAT(dv.hidden_from_user_id) as hidden_from_users
      FROM documents d
      LEFT JOIN document_visibility dv ON d.id = dv.document_id
      WHERE d.project_id = ?
    `;

    const params = [id];

    // If user is a team member, exclude documents they're hidden from
    if (isTeamMember) {
      query += ` AND (dv.hidden_from_user_id IS NULL OR dv.hidden_from_user_id != ?)`;
      params.push(userId);
    }

    query += ` GROUP BY d.id ORDER BY d.created_at DESC`;

    const [rows] = await db.query(query, params);

    // Format the results
    const documents = rows.map(doc => ({
      ...doc,
      hidden_from_users: doc.hidden_from_users
        ? doc.hidden_from_users.split(',').map(id => parseInt(id))
        : []
    }));

    res.json({
      success: true,
      data: documents
    });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch files',
      message: err.message
    });
  }
});

/**
 * Update document visibility
 * PATCH /api/projects/:id/files/:fileId/visibility
 * Body: { hidden_from_users: [userId1, userId2, ...] }
 */
router.patch('/projects/:id/files/:fileId/visibility', async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { fileId } = req.params;
    const { hidden_from_users } = req.body;

    if (!Array.isArray(hidden_from_users)) {
      return res.status(400).json({
        success: false,
        error: 'hidden_from_users must be an array'
      });
    }

    await connection.beginTransaction();

    // First, delete all existing visibility restrictions for this document
    await connection.query(
      `DELETE FROM document_visibility WHERE document_id = ?`,
      [fileId]
    );

    // Insert new visibility restrictions if any
    if (hidden_from_users.length > 0) {
      const visibilityValues = hidden_from_users.map(userId => [fileId, userId]);
      await connection.query(
        `INSERT INTO document_visibility (document_id, hidden_from_user_id) VALUES ?`,
        [visibilityValues]
      );
    }

    // Update the document's updated_at timestamp
    await connection.query(
      `UPDATE documents SET updated_at = NOW() WHERE id = ?`,
      [fileId]
    );

    await connection.commit();

    console.log('Document visibility updated:', {
      fileId,
      hidden_from_users
    });

    res.json({
      success: true,
      message: 'Document visibility updated successfully',
      data: {
        hidden_from_users
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error updating document visibility:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update document visibility',
      message: err.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Delete document
 * DELETE /api/projects/:id/files?fileId=...
 */
router.delete('/projects/:id/files', async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        error: 'File ID is required'
      });
    }

    // Get file path before deleting
    const [files] = await connection.query(
      'SELECT file_path FROM documents WHERE id = ?',
      [fileId]
    );

    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    const filePath = files[0].file_path;

    await connection.beginTransaction();

    // Delete visibility restrictions (will cascade if FK is set up correctly)
    await connection.query(
      'DELETE FROM document_visibility WHERE document_id = ?',
      [fileId]
    );

    // Delete from database
    const [result] = await connection.query(
      'DELETE FROM documents WHERE id = ?',
      [fileId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'Failed to delete file'
      });
    }

    await connection.commit();

    // Try to delete physical file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Physical file deleted:', filePath);
      }
    } catch (fileErr) {
      console.error('Error deleting physical file:', fileErr);
      // Continue even if physical file deletion fails
    }

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error deleting document:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file',
      message: err.message
    });
  } finally {
    connection.release();
  }
});

/**
 * Update document metadata
 * PATCH /api/projects/:id/files/:fileId
 */
router.patch('/projects/:id/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { title, description, category, role_access } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (role_access !== undefined) {
      updateFields.push('role_access = ?');
      updateValues.push(role_access);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(fileId);

    const [result] = await db.query(
      `UPDATE documents SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    res.json({
      success: true,
      message: 'File updated successfully'
    });
  } catch (err) {
    console.error('Error updating document:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update file',
      message: err.message
    });
  }
});

/**
 * Toggle document confidential status (DEPRECATED - use visibility instead)
 * PATCH /api/projects/:id/files/:fileId/confidential
 */
router.patch('/projects/:id/files/:fileId/confidential', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { is_confidential } = req.body;

    if (is_confidential === undefined) {
      return res.status(400).json({
        success: false,
        error: 'is_confidential is required'
      });
    }

    const [result] = await db.query(
      `UPDATE documents SET is_confidential = ?, updated_at = NOW() WHERE id = ?`,
      [is_confidential, fileId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    console.log('Document confidential status updated:', {
      fileId,
      is_confidential
    });

    res.json({
      success: true,
      message: 'Document confidential status updated successfully'
    });
  } catch (err) {
    console.error('Error updating confidential status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update confidential status',
      message: err.message
    });
  }
});

// ==================== CATEGORY ROUTES ====================

/**
 * Create custom category
 * POST /api/categories
 */
router.post('/categories', async (req, res) => {
  try {
    const { name, extensions, icon, color, project_id, created_by } = req.body;

    if (!name || !extensions || !created_by) {
      return res.status(400).json({
        success: false,
        error: 'Name, extensions, and created_by are required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO document_categories
        (name, extensions, icon, color, project_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        JSON.stringify(extensions),
        icon || 'File',
        color || 'gray',
        project_id || null,
        created_by
      ]
    );

    res.json({
      success: true,
      data: {
        id: result.insertId,
        name,
        extensions,
        icon: icon || 'File',
        color: color || 'gray'
      }
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to create category',
      message: err.message
    });
  }
});

/**
 * Get all categories (custom only)
 * GET /api/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const { project_id } = req.query;

    let query = `
      SELECT id, name, icon, color, extensions, mime_types, is_custom
      FROM document_categories
      WHERE is_custom = TRUE
    `;

    const params = [];

    if (project_id) {
      query += ` AND (project_id = ? OR project_id IS NULL)`;
      params.push(project_id);
    }

    const [rows] = await db.query(query, params);

    // Parse JSON strings back to arrays
    const categories = rows.map(row => ({
      ...row,
      extensions: JSON.parse(row.extensions),
      mime_types: row.mime_types ? JSON.parse(row.mime_types) : []
    }));

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: err.message
    });
  }
});

/**
 * Delete custom category
 * DELETE /api/categories/:id
 */
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM document_categories WHERE id = ? AND is_custom = TRUE',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found or cannot be deleted'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category',
      message: err.message
    });
  }
});

module.exports = router;