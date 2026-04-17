'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle, Smile, Paperclip } from 'lucide-react';
import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

export default function ProjectChatRoom({ projectId, currentUserId, currentUserName }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomId, setRoomId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initChat = async () => {
      try {
        setLoading(true);

        const roomResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/chat-room`);
        const roomData = await roomResponse.json();

        if (!roomData.success) {
          throw new Error('Failed to load chat room');
        }

        const fetchedRoomId = roomData.data.id;
        setRoomId(fetchedRoomId);

        const messagesResponse = await fetch(`http://localhost:5000/api/chat-rooms/${fetchedRoomId}/messages`);
        const messagesData = await messagesResponse.json();

        if (messagesData.success) {
          setMessages(messagesData.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    if (projectId && currentUserId) {
      initChat();
    }
  }, [projectId, currentUserId]);

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to Socket.io');
      newSocket.emit('join-room', {
        roomId,
        userId: currentUserId,
        userName: currentUserName
      });
    });

    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);

      if (message.senderId !== currentUserId) {
        newSocket.emit('mark-read', {
          roomId,
          userId: currentUserId,
          messageId: message.id
        });
      }
    });

    newSocket.on('room-users-count', ({ count }) => {
      setOnlineCount(count);
    });

    newSocket.on('user-typing', ({ userId, userName }) => {
      if (userId !== currentUserId) {
        setTypingUsers(prev => new Set(prev).add(userName));
      }
    });

    newSocket.on('user-stop-typing', ({ userId }) => {
      setTypingUsers(prev => {
        const updated = new Set(prev);
        return updated;
      });
    });

    newSocket.on('message-error', ({ error }) => {
      console.error('Message error:', error);
      setSending(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave-room', { roomId });
      newSocket.close();
    };
  }, [roomId, currentUserId, currentUserName]);

  const handleTyping = () => {
    if (!socket || !roomId) return;

    socket.emit('typing-start', {
      roomId,
      userId: currentUserId,
      userName: currentUserName
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing-stop', {
        roomId,
        userId: currentUserId
      });
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !roomId || sending) return;

    setSending(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing-stop', { roomId, userId: currentUserId });

    socket.emit('send-message', {
      roomId,
      senderId: currentUserId,
      text: newMessage.trim()
    });

    setNewMessage('');
    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;

    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();

    return currentDate !== prevDate;
  };

  const shouldShowAvatar = (currentMsg, nextMsg) => {
    if (!nextMsg) return true;

    const isSameSender = currentMsg.senderId === nextMsg.senderId;
    const timeDiff = new Date(nextMsg.timestamp) - new Date(currentMsg.timestamp);
    const isWithinMinute = timeDiff < 60000;

    return !isSameSender || !isWithinMinute;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-black dark:text-white text-sm">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load chat</h3>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-border">
                <Send className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2">No messages yet</h3>
              <p className="text-sm text-black dark:text-white">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 max-w-4xl mx-auto">
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId;
              const showAvatar = shouldShowAvatar(message, messages[index + 1]);
              const showDate = shouldShowDateSeparator(message, messages[index - 1]);
              const prevMessage = messages[index - 1];
              const isFirstInGroup = !prevMessage || prevMessage.senderId !== message.senderId ||
                (new Date(message.timestamp) - new Date(prevMessage.timestamp)) > 60000;

              return (
                <React.Fragment key={message.id}>
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex items-center justify-center py-4">
                      <div className="bg-card/90 backdrop-blur-xl px-4 py-1.5 rounded-full shadow-lg border border-border/50">
                        <span className="text-xs font-medium text-foreground">
                          {formatDateSeparator(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                      isFirstInGroup ? 'mt-4' : 'mt-0.5'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-8">
                      {!isOwn && showAvatar ? (
                        <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                          <AvatarImage src={message.senderAvatar} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {message.senderName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[65%]`}>
                      {/* Sender Name (only for first message in group and not own messages) */}
                      {!isOwn && isFirstInGroup && (
                        <span className="text-xs font-medium text-foreground mb-1 px-3">
                          {message.senderName}
                        </span>
                      )}

                      {/* Message Bubble */}
                      <div className="group relative">
                        <div
                          className={`px-4 py-2.5 rounded-2xl shadow-lg transition-all duration-200 ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-tr-md hover:shadow-xl'
                              : 'bg-card/90 backdrop-blur-xl text-foreground rounded-tl-md border border-border/50 hover:shadow-xl'
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.text}
                          </p>
                        </div>

                        {/* Timestamp on hover */}
                        <div className={`absolute -bottom-5 ${isOwn ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <span className="text-xs text-black dark:text-white">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
              <div className="flex gap-2 mt-2">
                <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {Array.from(typingUsers)[0]?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-card/90 backdrop-blur-xl rounded-2xl rounded-tl-md px-4 py-3 shadow-lg border border-border/50">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl px-6 py-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              className="w-full px-4 py-3 pr-12 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-3xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none overflow-y-auto max-h-32 shadow-sm"
              rows="1"
              disabled={sending}
              style={{
                minHeight: '44px',
                lineHeight: '1.5'
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 bottom-1.5 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 disabled:bg-muted flex-shrink-0 shadow-lg hover:shadow-xl transition-all"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}