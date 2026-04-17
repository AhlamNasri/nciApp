const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Get chat room for a project
 * GET /api/projects/:projectId/chat-room
 */
router.get('/projects/:projectId/chat-room', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get or create chat room
    let [rooms] = await db.query(
      'SELECT id, room_name FROM chat_rooms WHERE project_id = ?',
      [projectId]
    );

    let roomId;
    if (rooms.length === 0) {
      // Create room if doesn't exist
      const [result] = await db.query(
        'INSERT INTO chat_rooms (project_id, room_name) VALUES (?, ?)',
        [projectId, 'Project Chat']
      );
      roomId = result.insertId;
    } else {
      roomId = rooms[0].id;
    }

    res.json({ success: true, data: { id: roomId, projectId } });
  } catch (error) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat room' });
  }
});

/**
 * Get messages for a chat room
 * GET /api/chat-rooms/:roomId/messages
 */
router.get('/chat-rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 100, before } = req.query;

    let query = `
      SELECT
        rm.id,
        rm.message_text as text,
        rm.created_at as timestamp,
        rm.sender_id as senderId,
        u.name as senderName,
        u.avatar_url as senderAvatar
      FROM room_messages rm
      JOIN users u ON rm.sender_id = u.id
      WHERE rm.room_id = ?
    `;

    const params = [roomId];

    if (before) {
      query += ' AND rm.id < ?';
      params.push(before);
    }

    query += ' ORDER BY rm.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [messages] = await db.query(query, params);

    // Reverse to get chronological order
    const formattedMessages = messages.reverse().map(msg => ({
      id: msg.id,
      text: msg.text,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`,
      timestamp: msg.timestamp
    }));

    res.json({ success: true, data: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

/**
 * Send a message to a chat room
 * POST /api/chat-rooms/:roomId/messages
 */
router.post('/chat-rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { senderId, text } = req.body;

    if (!senderId || !text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Sender ID and message text are required'
      });
    }

    // Insert message
    const [result] = await db.query(
      'INSERT INTO room_messages (room_id, sender_id, message_text) VALUES (?, ?, ?)',
      [roomId, senderId, text.trim()]
    );

    // Get the created message with user info
    const [messages] = await db.query(`
      SELECT
        rm.id,
        rm.message_text as text,
        rm.created_at as timestamp,
        rm.sender_id as senderId,
        u.name as senderName,
        u.avatar_url as senderAvatar
      FROM room_messages rm
      JOIN users u ON rm.sender_id = u.id
      WHERE rm.id = ?
    `, [result.insertId]);

    const message = {
      id: messages[0].id,
      text: messages[0].text,
      senderId: messages[0].senderId,
      senderName: messages[0].senderName,
      senderAvatar: messages[0].senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${messages[0].senderName}`,
      timestamp: messages[0].timestamp
    };

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * Get unread count for a user in a room
 * GET /api/chat-rooms/:roomId/unread?userId=...
 */
router.get('/chat-rooms/:roomId/unread', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get last read message
    const [reads] = await db.query(
      'SELECT last_read_message_id FROM room_message_reads WHERE room_id = ? AND user_id = ?',
      [roomId, userId]
    );

    const lastReadId = reads[0]?.last_read_message_id || 0;

    // Count unread messages
    const [counts] = await db.query(
      'SELECT COUNT(*) as count FROM room_messages WHERE room_id = ? AND id > ? AND sender_id != ?',
      [roomId, lastReadId, userId]
    );

    res.json({ success: true, count: counts[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
});

/**
 * Mark messages as read
 * POST /api/chat-rooms/:roomId/mark-read
 */
router.post('/chat-rooms/:roomId/mark-read', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, messageId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Upsert read status
    await db.query(`
      INSERT INTO room_message_reads (room_id, user_id, last_read_message_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE last_read_message_id = VALUES(last_read_message_id)
    `, [roomId, userId, messageId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
  }
});

/**
 * Delete a message
 * DELETE /api/chat-rooms/:roomId/messages/:messageId
 */
router.delete('/chat-rooms/:roomId/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Verify user is the sender
    const [messages] = await db.query(
      'SELECT sender_id FROM room_messages WHERE id = ?',
      [messageId]
    );

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    if (messages[0].sender_id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own messages'
      });
    }

    await db.query('DELETE FROM room_messages WHERE id = ?', [messageId]);

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

/**
 * Get combined unread messages count (1-to-1 + room messages)
 * GET /api/messages/unread-count-combined?userId=...
 */
router.get('/messages/unread-count-combined', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Count 1-to-1 unread messages
    const [directMessages] = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [userId]
    );
    const directUnread = directMessages[0].count;

    // Count room messages unread
    let roomUnread = 0;

    // Get all projects user is part of (creator or member)
    const [projects] = await db.query(`
      SELECT DISTINCT p.id
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.creator_id = ? OR pm.user_id = ?
    `, [userId, userId]);

    if (projects.length > 0) {
      const projectIds = projects.map(p => p.id);

      // Get chat rooms for these projects
      const placeholders = projectIds.map(() => '?').join(',');
      const [rooms] = await db.query(
        `SELECT id FROM chat_rooms WHERE project_id IN (${placeholders})`,
        projectIds
      );

      if (rooms.length > 0) {
        // For each room, count unread messages
        for (const room of rooms) {
          const roomId = room.id;

          // Get last read message ID for this user in this room
          const [reads] = await db.query(
            'SELECT last_read_message_id FROM room_message_reads WHERE room_id = ? AND user_id = ?',
            [roomId, userId]
          );

          const lastReadId = reads[0]?.last_read_message_id || 0;

          // Count unread messages (messages after last read, not sent by user)
          const [counts] = await db.query(
            'SELECT COUNT(*) as count FROM room_messages WHERE room_id = ? AND id > ? AND sender_id != ?',
            [roomId, lastReadId, userId]
          );

          roomUnread += counts[0].count;
        }
      }
    }

    const totalUnread = directUnread + roomUnread;

    res.json({
      success: true,
      count: totalUnread,
      breakdown: {
        direct: directUnread,
        rooms: roomUnread
      }
    });
  } catch (error) {
    console.error('Error fetching combined unread count:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch unread count' });
  }
});

module.exports = router;