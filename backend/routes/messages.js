const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * Get all 1-to-1 messages between two users
 * GET /api/messages?userId=1&otherUserId=2
 */
router.get('/messages', async (req, res) => {
  try {
    const { userId, otherUserId } = req.query;

    if (!userId || !otherUserId) {
      return res.status(400).json({
        success: false,
        error: 'Both userId and otherUserId are required'
      });
    }

    const [messages] = await db.query(`
      SELECT
        m.id,
        m.sender_id as senderId,
        m.receiver_id as receiverId,
        m.message_text as text,
        m.is_read as isRead,
        m.created_at as timestamp,
        sender.name as senderName,
        sender.avatar_url as senderAvatar
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [userId, otherUserId, otherUserId, userId]);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`,
      isRead: msg.isRead === 1,
      timestamp: msg.timestamp
    }));

    res.json({ success: true, data: formattedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send a 1-to-1 message
 * POST /api/messages
 */
router.post('/messages', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    if (!senderId || !receiverId || !text?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Sender ID, receiver ID, and message text are required'
      });
    }

    const [result] = await db.query(
      'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
      [senderId, receiverId, text.trim()]
    );

    // Get the created message with user info
    const [messages] = await db.query(`
      SELECT
        m.id,
        m.sender_id as senderId,
        m.receiver_id as receiverId,
        m.message_text as text,
        m.is_read as isRead,
        m.created_at as timestamp,
        sender.name as senderName,
        sender.avatar_url as senderAvatar
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      WHERE m.id = ?
    `, [result.insertId]);

    const message = {
      id: messages[0].id,
      text: messages[0].text,
      senderId: messages[0].senderId,
      receiverId: messages[0].receiverId,
      senderName: messages[0].senderName,
      senderAvatar: messages[0].senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${messages[0].senderName}`,
      isRead: messages[0].isRead === 1,
      timestamp: messages[0].timestamp
    };

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Mark messages as read
 * PUT /api/messages/mark-read
 */
router.put('/messages/mark-read', async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;

    if (!userId || !otherUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and other user ID are required'
      });
    }

    // Mark all messages from otherUserId to userId as read
    await db.query(
      'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0',
      [userId, otherUserId]
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get unread count for direct messages only
 * GET /api/messages/unread/count?userId=1
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

    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND is_read = 0',
      [userId]
    );

    res.json({ success: true, count: result[0].count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get conversation list with unread counts
 * GET /api/messages/conversations?userId=1
 */
router.get('/messages/conversations', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Get all users the current user has conversed with
    const [conversations] = await db.query(`
      SELECT DISTINCT
        CASE
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END as otherUserId,
        u.name as otherUserName,
        u.avatar_url as otherUserAvatar,
        (SELECT COUNT(*)
         FROM messages
         WHERE receiver_id = ?
           AND sender_id = otherUserId
           AND is_read = 0) as unreadCount,
        (SELECT message_text
         FROM messages
         WHERE (sender_id = ? AND receiver_id = otherUserId)
            OR (sender_id = otherUserId AND receiver_id = ?)
         ORDER BY created_at DESC
         LIMIT 1) as lastMessage,
        (SELECT created_at
         FROM messages
         WHERE (sender_id = ? AND receiver_id = otherUserId)
            OR (sender_id = otherUserId AND receiver_id = ?)
         ORDER BY created_at DESC
         LIMIT 1) as lastMessageTime
      FROM messages m
      JOIN users u ON u.id = CASE
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY lastMessageTime DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId, userId]);

    const formattedConversations = conversations.map(conv => ({
      otherUserId: conv.otherUserId,
      otherUserName: conv.otherUserName,
      otherUserAvatar: conv.otherUserAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.otherUserName}`,
      unreadCount: conv.unreadCount,
      lastMessage: conv.lastMessage,
      lastMessageTime: conv.lastMessageTime
    }));

    res.json({ success: true, data: formattedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;