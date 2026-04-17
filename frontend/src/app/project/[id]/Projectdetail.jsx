import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, Mail, Trash2, UserPlus, ArrowLeft, Loader2, FileText, Save, Edit2, CheckCircle, Clock, Link2, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authService } from '../../utils/auth';

const API_BASE_URL = 'http://localhost:5000/api';

const ProjectDetail = ({ projectId, onClose, onNavigateToFiles, isTeamMember }) => {
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    const userId = authService.getUserId();
    setCurrentUserId(userId);

    if (projectId) {
      fetchProjectDetails();
      fetchProjectMembers();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.data);
        setDescription(data.data.description || '');

        // Debug: Check if invite_code is coming from backend
        console.log('Project data:', data.data);
        console.log('Invite code:', data.data.inviteCode);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`);
      const data = await response.json();
      if (data.success) {
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setNewMemberEmail('');
        setSearchResults([]);
        setShowAddMember(false);
        fetchProjectMembers();
      } else {
        alert(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchProjectMembers();
      } else {
        alert(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        setProject({ ...project, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSaveDescription = async () => {
    setSavingDescription(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/description`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });

      const data = await response.json();

      if (data.success) {
        setProject({ ...project, description });
        setEditingDescription(false);
      } else {
        alert('Failed to save description');
      }
    } catch (error) {
      console.error('Error saving description:', error);
      alert('Failed to save description');
    } finally {
      setSavingDescription(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        onClose();
        window.location.reload();
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project');
    }
  };

  const handleCopyInviteLink = () => {
    if (!project?.inviteCode) {
      console.error('No invite code available');
      return;
    }

    // Use the current window location origin instead of hardcoded domain
    const inviteLink = `${window.location.origin}/invite/${project.inviteCode}`;

    navigator.clipboard.writeText(inviteLink)
      .then(() => {
        console.log('Invite link copied:', inviteLink);
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy invite link:', err);
        alert('Failed to copy link to clipboard');
      });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = () => {
    if (!project?.endDate) return null;
    const end = new Date(project.endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isProjectCreator = project && currentUserId && project.creatorId === currentUserId;
  const canEdit = !isTeamMember || isProjectCreator;
  const canDelete = !isTeamMember || isProjectCreator;
  const canManageMembers = !isTeamMember || isProjectCreator;
  const canChangeStatus = !isTeamMember || isProjectCreator;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-card/95 backdrop-blur-xl rounded-xl p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const daysRemaining = getDaysRemaining();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl w-full max-w-[95vw] lg:max-w-6xl max-h-[95vh] overflow-hidden my-4 shadow-2xl border border-border flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigateToFiles(projectId)}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Documents
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Section */}
          <div className="relative">
            {project.image && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={`http://localhost:5000${project.image}`}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm ${
                  project.status === 'ongoing'
                    ? 'bg-green-500/90 text-white'
                    : 'bg-card/90 text-foreground'
                }`}>
                  {project.status === 'ongoing' ? 'Active' : 'Completed'}
                </span>
                {project.status === 'ongoing' && daysRemaining !== null && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-card/90 backdrop-blur-sm text-foreground">
                    {daysRemaining > 0 ? `${daysRemaining} days left` : daysRemaining === 0 ? 'Due today' : `${Math.abs(daysRemaining)} days overdue`}
                  </span>
                )}
                {isTeamMember && !isProjectCreator && (
                  <span className="px-2.5 py-1 bg-primary/80 backdrop-blur-sm text-primary-foreground text-xs font-medium rounded-md">
                    Team Member
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white drop-shadow-lg">{project.title}</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">About</h2>
                  {canEdit && !editingDescription && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingDescription(true)}
                      className="gap-2 h-8"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {editingDescription && canEdit ? (
                  <div className="space-y-3">
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add project details, goals, and important notes..."
                      rows={6}
                      className="resize-none bg-muted/50 border-border"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveDescription}
                        disabled={savingDescription}
                        size="sm"
                        className="gap-2"
                      >
                        {savingDescription ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDescription(false);
                          setDescription(project.description || '');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {project.description || 'No description yet.'}
                  </p>
                )}
              </div>

              {/* Invite Link Section */}
              {project.inviteCode && canManageMembers && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Invite Link</h2>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Link2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-1">
                          Share this project
                        </h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                          Anyone with this link can join the project as a team member
                        </p>
                        <div className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2 p-2.5 bg-white dark:bg-gray-900 rounded-md border border-blue-200 dark:border-blue-800">
                            <input
                              type="text"
                              value={`${window.location.origin}/invite/${project.inviteCode}`}
                              readOnly
                              className="flex-1 bg-transparent outline-none text-xs text-gray-600 dark:text-gray-400 font-mono truncate"
                            />
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleCopyInviteLink}
                            className="gap-2 flex-shrink-0"
                          >
                            {copiedInvite ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Copy
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Timeline</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                      <div className="font-semibold text-foreground">{formatDate(project.startDate)}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">End Date</div>
                      <div className="font-semibold text-foreground">{formatDate(project.endDate)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Lead */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">Project Lead</h2>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
                  <Avatar className="h-14 w-14 border-2 border-border">
                    <AvatarImage src={project.creator.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {project.creator.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-foreground">{project.creator.name}</div>
                    <div className="text-sm text-muted-foreground">Project Owner</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team
                    <span className="ml-1 px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                      {members.length}
                    </span>
                  </h2>
                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddMember(!showAddMember)}
                      className="gap-1.5 h-8 px-2"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {showAddMember && canManageMembers && (
                  <div className="mb-4 space-y-2">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="Search by email"
                        value={newMemberEmail}
                        onChange={(e) => {
                          setNewMemberEmail(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        className="pl-10 h-9 text-sm bg-muted/50"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto bg-card">
                        {searchResults.map(user => (
                          <button
                            key={user.id}
                            className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                            onClick={() => handleAddMember(user.email)}
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-foreground truncate text-sm">{user.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="text-center py-8 rounded-lg bg-muted/20 border border-dashed border-border">
                      <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No members yet</p>
                      {canManageMembers && (
                        <p className="text-xs text-muted-foreground mt-1">Add team members to collaborate</p>
                      )}
                    </div>
                  ) : (
                    members.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors group">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{member.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate text-sm">{member.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{member.email}</div>
                        </div>
                        {canManageMembers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              {(canChangeStatus || canDelete) && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-4">Actions</h2>
                  <div className="space-y-2">
                    {canChangeStatus && (
                      <>
                        <Button
                          variant={project.status === 'ongoing' ? 'default' : 'outline'}
                          className="w-full justify-start gap-2"
                          onClick={() => handleUpdateStatus('ongoing')}
                          size="sm"
                        >
                          <Clock className="h-4 w-4" />
                          Mark as Active
                        </Button>
                        <Button
                          variant={project.status === 'past' ? 'default' : 'outline'}
                          className="w-full justify-start gap-2"
                          onClick={() => handleUpdateStatus('past')}
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Mark as Completed
                        </Button>
                      </>
                    )}
                    {canDelete && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        onClick={handleDeleteProject}
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Project
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;