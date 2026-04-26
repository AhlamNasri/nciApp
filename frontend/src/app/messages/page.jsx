'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Loader2, MessageSquare, Users as UsersIcon, Search, MoreVertical } from 'lucide-react';
import { authService } from '../utils/auth';
import { useRouter } from 'next/navigation';
import ProjectChatRoom from '../project/[id]/ProjectChatRoom';
import { API_BASE_URL, BACKEND_URL } from '../config';

export default function MessagesPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userId = authService.getUserId();
    const userInfo = authService.getUser();
    setCurrentUserId(userId);
    setCurrentUser(userInfo);
    fetchUserProjects(userId);
  }, []);

  const fetchUserProjects = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/projects`);
      const data = await response.json();

      if (data.success) {
        const userProjects = data.data.filter(project => {
          const isCreator = project.creatorId === userId;
          const isMember = project.members?.some(member => member.userId === userId);
          return isCreator || isMember;
        });
        setProjects(userProjects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen relative">
        {/* Background Image with Blur */}
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/backk.png)',
            filter: 'blur(2px)',
            transform: 'scale(1.1)'
          }}
        />
        {/* Overlay */}
        <div className="fixed inset-0 z-0 bg-background/40" />

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-black dark:text-white">Loading your conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Blur */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/backk.png)',
          filter: 'blur(2px)',
          transform: 'scale(1.1)'
        }}
      />

      {/* Overlay for better readability */}
      <div className="fixed inset-0 z-0 bg-background/40" />

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col overflow-hidden">
        {/* Compact Header */}
        <nav className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/homepage')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg">
                <img
                  src="/logo.jpeg"
                  alt="ProjectHub Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Messages</h1>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
              <AvatarImage src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.name}`} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {currentUser?.name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Conversation List */}
          <div className="w-80 border-r border-border/50 flex flex-col bg-card/80 backdrop-blur-xl shadow-lg">
            {/* Search Bar */}
            <div className="p-3 border-b border-border/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-border">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-black dark:text-white">
                    {searchQuery ? 'No conversations found' : 'No projects yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredProjects.map((project) => {
                    const isSelected = selectedProject?.id === project.id;

                    return (
                      <button
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={`w-full text-left p-4 transition-all hover:bg-muted/30 ${
                          isSelected ? 'bg-primary/10 backdrop-blur-sm' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-12 w-12 border-2 border-background shadow-md">
                              <AvatarImage src={`${BACKEND_URL}${project.image}`} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {project.title[0]}
                              </AvatarFallback>
                            </Avatar>
                            {project.status === 'ongoing' && (
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card shadow-sm"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between mb-1">
                              <p className="font-semibold text-foreground truncate text-sm">
                                {project.title}
                              </p>
                              <span className="text-xs text-black dark:text-white ml-2 flex-shrink-0">
                                2h
                              </span>
                            </div>
                            <p className="text-xs text-black dark:text-white truncate">
                              {project.description || `${project.members?.length || 0} members`}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedProject ? (
              <>
                {/* Chat Header */}
                <div className="bg-card/80 backdrop-blur-xl border-b border-border/50 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-background shadow-md">
                      <AvatarImage src={`${BACKEND_URL}${selectedProject.image}`} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {selectedProject.title[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        {selectedProject.title}
                      </h2>
                      <p className="text-xs text-black dark:text-white">
                        {selectedProject.members?.length || 0} members
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Search className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Chat Component */}
                <div className="flex-1 overflow-hidden">
                  <ProjectChatRoom
                    projectId={selectedProject.id}
                    currentUserId={currentUserId}
                    currentUserName={currentUser?.name || 'User'}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="w-24 h-24 bg-card/80 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 shadow-2xl border border-border">
                  <MessageSquare className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Select a Conversation
                </h3>
                <p className="text-black dark:text-white text-center max-w-md">
                  Choose a project from the sidebar to view messages and chat with your team
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}