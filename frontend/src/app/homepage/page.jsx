'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MessageSquare, Clock, CheckCircle, X, Upload, Calendar, Link2, Users, ChevronRight, ChevronLeft, ArrowLeft, Loader2, AlertCircle, LogOut, RefreshCw, Briefcase, FolderOpen, Camera, User as UserIcon, UserPlus } from 'lucide-react';
import { authService } from '../utils/auth';
import ProjectDetail from '../project/[id]/Projectdetail.jsx';
import ProjectFiles from '../project/[id]/Projectfiles.jsx';
import ProfilePage from './ProfilePage.jsx';
import JoinProject from './JoinProject.jsx';

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState('home');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [inviteCode, setInviteCode] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInviteCode, setJoinInviteCode] = useState('');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      window.location.href = '/';
      return;
    }

    const userId = authService.getUserId();
    const roleId = authService.getRoleId();

    setCurrentUserId(userId);
    setUserRole(roleId);
    setIsTeamMember(roleId > 1);

    // Check for invite code in URL
    const inviteParam = searchParams?.get('invite');
    if (inviteParam) {
      setInviteCode(inviteParam);
      setCurrentPage('join');
    }

    // Fetch user profile from database
    fetchUserProfile(userId);
  }, [searchParams]);

  useEffect(() => {
    if (currentUserId) {
      fetchProjects();
    }
  }, [currentUserId]);

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserAvatar(data.data.avatar);
          setUserName(data.data.name);
          setUserEmail(data.data.email);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/projects`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        if (isTeamMember) {
          const filteredProjects = data.data.filter(project =>
            project.members?.some(member => member.userId === currentUserId) ||
            project.creatorId === currentUserId
          );
          setProjects(filteredProjects);
        } else {
          setProjects(data.data);
        }
        setError(null);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('Error connecting to server: ' + err.message);
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (newProject) => {
    if (isTeamMember) {
      console.error('Team members cannot create projects');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newProject,
          creatorId: currentUserId,
          inviteCode: newProject.inviteCode // ✅ Pass the invite code
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();

      if (data.success) {
        const projectId = data.data.id;

        if (newProject.teamMembers && newProject.teamMembers.length > 0) {
          for (const member of newProject.teamMembers) {
            try {
              const memberResponse = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: member.email
                }),
              });

              if (memberResponse.ok) {
                const memberData = await memberResponse.json();
                console.log('Member add response:', memberData);

                if (!memberData.success) {
                  console.error('Failed to add member:', member.email, memberData);
                }
              }
            } catch (err) {
              console.error('Failed to add member:', member.email, err);
            }
          }
        }

        setProjects([data.data, ...projects]);
        setCurrentPage('home');
      } else {
        alert('Failed to create project: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Error creating project: ' + err.message);
    }
  };

  const handleAvatarUpdate = (newAvatar) => {
    setUserAvatar(newAvatar);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  const handleJoinSuccess = (projectId) => {
    setCurrentPage('home');
    fetchProjects();
  };

  const handleJoinClick = () => {
    setShowJoinModal(true);
  };

  const handleJoinSubmit = () => {
    if (joinInviteCode.trim()) {
      // Extract just the UUID from full URL if provided
      let code = joinInviteCode.trim();
      const urlMatch = code.match(/invite\/([a-f0-9-]+)/i);
      if (urlMatch) {
        code = urlMatch[1];
      }

      setInviteCode(code);
      setCurrentPage('join');
      setShowJoinModal(false);
      setJoinInviteCode('');
    }
  };

  // Render Join Project Page
  if (currentPage === 'join' && inviteCode) {
    return <JoinProject
      inviteCode={inviteCode}
      onBack={() => {
        setCurrentPage('home');
        setInviteCode(null);
      }}
      onSuccess={handleJoinSuccess}
    />;
  }

  // Render Profile Page
  if (currentPage === 'profile') {
    return <ProfilePage
      userAvatar={userAvatar}
      userName={userName}
      userEmail={userEmail}
      currentUserId={currentUserId}
      userRole={userRole}
      onBack={() => setCurrentPage('home')}
      onAvatarUpdate={handleAvatarUpdate}
    />;
  }

  // Render Create Project Page
  if (currentPage === 'create') {
    if (isTeamMember) {
      setCurrentPage('home');
      return null;
    }
    return <CreateProjectPage
      onBack={() => setCurrentPage('home')}
      onCreate={handleCreateProject}
    />;
  }

  if (!currentUserId || userRole === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return <HomePage
    projects={projects}
    loading={loading}
    error={error}
    onCreateClick={() => setCurrentPage('create')}
    onJoinClick={handleJoinClick}
    onProfileClick={() => setCurrentPage('profile')}
    onRefresh={fetchProjects}
    onLogout={handleLogout}
    isTeamMember={isTeamMember}
    userRole={userRole}
    userAvatar={userAvatar}
    userName={userName}
    userEmail={userEmail}
    currentUserId={currentUserId}
    onAvatarUpdate={handleAvatarUpdate}
    showJoinModal={showJoinModal}
    setShowJoinModal={setShowJoinModal}
    joinInviteCode={joinInviteCode}
    setJoinInviteCode={setJoinInviteCode}
    onJoinSubmit={handleJoinSubmit}
  />;
}

function HomePage({
  projects,
  loading,
  error,
  onCreateClick,
  onJoinClick,
  onProfileClick,
  onRefresh,
  onLogout,
  isTeamMember,
  userRole,
  userAvatar,
  userName,
  userEmail,
  currentUserId,
  onAvatarUpdate,
  showJoinModal,
  setShowJoinModal,
  joinInviteCode,
  setJoinInviteCode,
  onJoinSubmit
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('ongoing');
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showFiles, setShowFiles] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const userId = authService.getUserId();
    if (!userId) return;

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/messages/unread-count-combined?userId=${userId}`
        );

        if (!res.ok) {
          console.error('Failed to fetch unread count:', res.status);
          return;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error('Non-JSON response from unread count endpoint');
          return;
        }

        const data = await res.json();

        if (data.success) {
          setUnreadCount(data.count);
        }
      } catch (err) {
        console.error('Failed to fetch unread messages count', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAvatarClick = () => {
    setShowUserMenu(false);
    setShowAvatarUpload(true);
  };

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Upload to server
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/avatar`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update avatar URL with full server path
        const fullAvatarUrl = `http://localhost:5000${data.avatarUrl}`;
        onAvatarUpdate(fullAvatarUrl);
        setShowAvatarUpload(false);
      } else {
        alert('Failed to upload avatar: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error uploading avatar:', err);
      alert('Failed to upload avatar: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/avatar`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Reset to default avatar
        onAvatarUpdate(`https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`);
        setShowAvatarUpload(false);
      } else {
        alert('Failed to remove avatar: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error removing avatar:', err);
      alert('Failed to remove avatar: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    if (activeTab === 'past') {
      const projectEndDate = new Date(p.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return projectEndDate < today;
    }
    return p.status === activeTab;
  });

  const handleProjectClick = (projectId) => {
    setSelectedProjectId(projectId);
    setShowFiles(false);
  };

  const handleCloseDetail = () => {
    setSelectedProjectId(null);
    setShowFiles(false);
    onRefresh();
  };

  const handleNavigateToFiles = (projectId) => {
    setShowFiles(true);
  };

  const handleBackToDetails = () => {
    setShowFiles(false);
  };

  const handleCloseFiles = () => {
    setSelectedProjectId(null);
    setShowFiles(false);
  };

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
      <div className="relative z-10 min-h-screen">
        {/* Navigation Bar */}
        <nav className="bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg">
                  <img
                    src="/logo.jpeg"
                    alt="ProjectHub Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground tracking-tight">ProjectHub</h1>
                  {isTeamMember && (
                    <span className="text-xs text-muted-foreground">Team Member</span>
                  )}
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant={activeTab === 'ongoing' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('ongoing')}
                  size="sm"
                  className="gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Active
                </Button>
                <Button
                  variant={activeTab === 'past' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('past')}
                  size="sm"
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 relative"
                  onClick={() => router.push('/messages')}
                >
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] text-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={onJoinClick}
                >
                  <UserPlus className="h-4 w-4" />
                  Join Project
                </Button>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRefresh}
                  className="hidden md:flex"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>

                {/* User Menu */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userAvatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'ME'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>

                  {showUserMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 mt-1"
                          onClick={() => {
                            setShowUserMenu(false);
                            onProfileClick();
                          }}
                        >
                          <UserIcon className="h-4 w-4" />
                          View Profile
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2"
                          onClick={handleAvatarClick}
                        >
                          <Camera className="h-4 w-4" />
                          Change Avatar
                        </Button>
                        <div className="h-px bg-border my-1" />
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={onLogout}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="md:hidden flex gap-2 pb-3">
              <Button
                size="sm"
                variant={activeTab === 'ongoing' ? 'default' : 'outline'}
                onClick={() => setActiveTab('ongoing')}
                className="flex-1"
              >
                Active
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'past' ? 'default' : 'outline'}
                onClick={() => setActiveTab('past')}
                className="flex-1"
              >
                Completed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 relative"
                onClick={() => router.push('/messages')}
              >
                <MessageSquare className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-destructive text-destructive-foreground text-[10px] rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onJoinClick}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {activeTab === 'ongoing' ? 'My Projects' : 'Completed Projects'}
            </h2>
            <p className="text-black dark:text-black">
              {isTeamMember
                ? (activeTab === 'ongoing' ? 'Your current assignments' : 'Projects you\'ve worked on')
                : (activeTab === 'ongoing' ? 'Manage ongoing work' : 'Review completed work')
              }
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-muted-foreground">Loading projects...</p>
            </div>
          ) : error ? (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Projects</h3>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button onClick={onRefresh} variant="default" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create Project Card */}
                {activeTab === 'ongoing' && !isTeamMember && (
                  <Card
                    className="border-2 border-dashed border-border hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={onCreateClick}
                  >
                    <CardContent className="flex flex-col items-center justify-center h-full min-h-[280px] p-6">
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                        <Plus className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">New Project</h3>
                      <p className="text-sm text-muted-foreground text-center">Create and manage a new project</p>
                    </CardContent>
                  </Card>
                )}

                {/* Project Cards */}
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border-border hover:border-primary/30"
                    onClick={() => handleProjectClick(project.id)}
                  >
                    <div className="relative h-40 overflow-hidden bg-muted">
                      <img
                        src={`http://localhost:5000${project.image}`}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                          project.status === 'ongoing'
                            ? 'bg-green-500/90 text-white'
                            : 'bg-card/90 text-foreground'
                        }`}>
                          {project.status === 'ongoing' ? 'Active' : 'Done'}
                        </span>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-1 text-base">{project.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border-2 border-background">
                          <AvatarImage src={project.creator.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {project.creator.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-none">{project.creator.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Lead</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {filteredProjects.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-16">
                    <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
                      {isTeamMember ? (
                        <AlertCircle className="h-10 w-10 text-muted-foreground" />
                      ) : (
                        <FolderOpen className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {isTeamMember
                        ? `No ${activeTab} projects`
                        : `No ${activeTab} projects yet`
                      }
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      {isTeamMember
                        ? (activeTab === 'ongoing'
                            ? 'You\'re not assigned to any projects right now'
                            : 'No completed projects to show')
                        : (activeTab === 'ongoing'
                            ? 'Start by creating your first project'
                            : 'Completed projects will show here')
                      }
                    </p>
                    {activeTab === 'ongoing' && !isTeamMember && (
                      <Button className="gap-2" onClick={onCreateClick}>
                        <Plus className="h-4 w-4" />
                        Create Project
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </main>
      </div>

      {/* Join Project Modal */}
      {showJoinModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => setShowJoinModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Join Project
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowJoinModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Enter the invite link or code to join a project</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Link or Code</Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="https://projecthub.app/invite/... or paste code"
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onJoinSubmit()}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={onJoinSubmit}
                  disabled={!joinInviteCode.trim()}
                  className="w-full gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Join Project
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => !uploadingAvatar && setShowAvatarUpload(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Change Avatar</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAvatarUpload(false)}
                    disabled={uploadingAvatar}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Upload a new profile picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Avatar Preview */}
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-32 w-32 border-4 border-border">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'ME'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="font-medium text-foreground">{userName}</p>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                  </div>
                </div>

                {/* Upload Area */}
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                    disabled={uploadingAvatar}
                  />

                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Choose Image
                      </>
                    )}
                  </Button>

                  {userAvatar && !userAvatar.includes('dicebear.com') && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                    >
                      <X className="h-4 w-4" />
                      Remove Avatar
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Recommended: Square image, max 5MB (JPG, PNG, GIF)
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Modals */}
      {selectedProjectId && !showFiles && (
        <ProjectDetail
          projectId={selectedProjectId}
          onClose={handleCloseDetail}
          onNavigateToFiles={handleNavigateToFiles}
          isTeamMember={isTeamMember}
        />
      )}

      {selectedProjectId && showFiles && (
        <ProjectFiles
          projectId={selectedProjectId}
          onClose={handleCloseFiles}
          onBackToDetails={handleBackToDetails}
          isTeamMember={isTeamMember}
        />
      )}
    </div>
  );
}

// Create Project Page Component
function CreateProjectPage({ onBack, onCreate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    startDate: '',
    endDate: '',
    teamMembers: [],
    inviteCode: '' // ✅ Initialize inviteCode
  });

  const handleNext = () => currentStep < 4 && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);

  const handleCreate = async () => {
    if (formData.title && formData.startDate && formData.endDate) {
      setSubmitting(true);
      await onCreate(formData);
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return formData.title.trim() !== '';
    if (currentStep === 3) return formData.startDate && formData.endDate;
    return true;
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image with Blur */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/backk.png)',
          filter: 'blur(8px)',
          transform: 'scale(1.1)'
        }}
      />

      {/* Overlay for better readability */}
      <div className="fixed inset-0 z-0 bg-background/40" />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        <div className="bg-card/80 backdrop-blur-xl border-b border-border/50">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Button variant="ghost" onClick={onBack} className="gap-2" disabled={submitting}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className="overflow-hidden shadow-lg border-border">
            {/* Progress Header */}
            <div className="bg-primary p-8 text-primary-foreground">
              <h1 className="text-2xl font-bold mb-2">Create New Project</h1>
              <p className="text-primary-foreground/80 mb-6">Step {currentStep} of 4</p>

              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        currentStep >= step
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary-foreground/20 text-primary-foreground/60'
                      }`}>
                        {step}
                      </div>
                      <span className="text-xs mt-2 font-medium">
                        {step === 1 && 'Details'}
                        {step === 2 && 'Image'}
                        {step === 3 && 'Timeline'}
                        {step === 4 && 'Team'}
                      </span>
                    </div>
                    {step < 4 && (
                      <div className={`h-0.5 flex-1 mx-2 transition-all ${
                        currentStep > step ? 'bg-primary-foreground' : 'bg-primary-foreground/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8">
              {currentStep === 1 && <Step1 formData={formData} setFormData={setFormData} />}
              {currentStep === 2 && <Step2 formData={formData} setFormData={setFormData} />}
              {currentStep === 3 && <Step3 formData={formData} setFormData={setFormData} />}
              {currentStep === 4 && <Step4 formData={formData} setFormData={setFormData} />}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-between bg-muted/30">
              <Button
                variant="outline"
                onClick={currentStep === 1 ? onBack : handleBack}
                disabled={submitting}
                className="gap-2"
              >
                {currentStep === 1 ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </>
                )}
              </Button>
              <div className="flex items-center gap-2">
                {(currentStep === 2 || currentStep === 4) && (
                  <Button variant="ghost" onClick={handleNext} disabled={submitting}>
                    Skip
                  </Button>
                )}
                <Button
                  onClick={currentStep === 4 ? handleCreate : handleNext}
                  disabled={!canProceed() || submitting}
                  className="gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : currentStep === 4 ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Create
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Step Components
function Step1({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">Project Name</h3>
        <p className="text-muted-foreground text-sm">Give your project a clear title</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Project Title *</Label>
        <Input
          id="title"
          type="text"
          placeholder="e.g., Website Redesign Project"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="h-12"
          autoFocus
        />
      </div>
    </div>
  );
}

function Step2({ formData, setFormData }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch('http://localhost:5000/api/upload-image', {
        method: 'POST',
        body: formDataUpload
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setFormData({ ...formData, image: data.imageUrl });
      } else {
        setError('Upload failed');
      }
    } catch (err) {
      console.error(err);
      setError('Upload error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">Project Cover</h3>
        <p className="text-muted-foreground text-sm">Add a cover image (optional)</p>
      </div>

      {formData.image && (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img
            src={`http://localhost:5000${formData.image}`}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full h-8 w-8"
            onClick={() => setFormData({ ...formData, image: '' })}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="imageUpload"
          onChange={(e) => handleFileUpload(e.target.files[0])}
        />

        <label htmlFor="imageUpload" className="cursor-pointer flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            {uploading ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-primary" />
            )}
          </div>

          <p className="font-medium text-foreground mb-1">
            {uploading ? 'Uploading...' : 'Upload image'}
          </p>
          <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB</p>
        </label>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

function Step3({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">Project Timeline</h3>
        <p className="text-muted-foreground text-sm">Set start and end dates</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Start Date *
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            End Date *
          </Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            min={formData.startDate}
            className="h-11"
          />
        </div>
      </div>
      {formData.startDate && formData.endDate && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground">
            Duration: {Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24))} days
          </p>
        </div>
      )}
    </div>
  );
}

// ✅ Updated Step4 with proper invite code handling using useEffect
function Step4({ formData, setFormData }) {
  const [memberInput, setMemberInput] = useState('');

  // ✅ Generate invite code once on mount and store it in formData
  useEffect(() => {
    if (!formData.inviteCode) {
      const code = crypto.randomUUID();
      setFormData(prev => ({ ...prev, inviteCode: code }));
    }
  }, []);

  const inviteCode = formData.inviteCode || crypto.randomUUID();
  const inviteLink = `https://projecthub.app/invite/${inviteCode}`;

  const addMember = () => {
    if (memberInput.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(memberInput.trim())) {
        alert('Please enter a valid email address');
        return;
      }

      if (formData.teamMembers.some(m => m.email === memberInput.trim())) {
        alert('This email has already been added');
        return;
      }

      setFormData({
        ...formData,
        teamMembers: [
          ...formData.teamMembers,
          { email: memberInput.trim() }
        ]
      });
      setMemberInput('');
    }
  };

  const removeMember = (index) => {
    setFormData({
      ...formData,
      teamMembers: formData.teamMembers.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-foreground mb-1">Team Members</h3>
        <p className="text-muted-foreground text-sm">Invite people to join (optional)</p>
      </div>

      {/* ✅ Highlighted Invite Link Section */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
              Share Project Invite Link
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Anyone with this link can join the project. You can also add members by email below.
            </p>
            <div className="flex gap-2 items-center p-2.5 bg-white dark:bg-gray-900 rounded-md border border-blue-200 dark:border-blue-800">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-transparent outline-none text-xs text-gray-600 dark:text-gray-400 font-mono"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  alert('Invite link copied to clipboard!');
                }}
                className="h-7"
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="memberInput">Add by Email</Label>
        <div className="flex gap-2">
          <Input
            id="memberInput"
            type="email"
            placeholder="colleague@company.com"
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMember()}
            className="flex-1 h-11"
          />
          <Button onClick={addMember} className="gap-2 h-11">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {formData.teamMembers.length > 0 ? (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Added Members ({formData.teamMembers.length})
          </Label>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {formData.teamMembers.map((member, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {member.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {member.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pending
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeMember(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-border rounded-lg bg-muted/30">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No members added yet</p>
          <p className="text-xs text-muted-foreground mt-1">Share the invite link or add members by email</p>
        </div>
      )}
    </div>
  );
}