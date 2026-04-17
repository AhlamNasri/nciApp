'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MessageSquare, Clock, CheckCircle, X, Upload, Calendar, Link2, Users, ChevronRight, ChevronLeft, Image, ArrowLeft, Settings, FileText, File, Trash2, UserPlus, Edit, Download, Info, FolderOpen } from 'lucide-react';

// Main App Component with Routing
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (newProject) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });

      if (response.ok) {
        await fetchProjects(); // Refresh projects list
        setCurrentPage('home');
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleProjectClick = (projectId) => {
    setSelectedProjectId(projectId);
    setCurrentPage('details');
  };

  const handleUpdateProject = async (updatedProject) => {
    try {
      const response = await fetch(`/api/projects/${updatedProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject)
      });

      if (response.ok) {
        await fetchProjects(); // Refresh projects list
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  if (currentPage === 'create') {
    return <CreateProjectPage
      onBack={() => setCurrentPage('home')}
      onCreate={handleCreateProject}
    />;
  }

  if (currentPage === 'details' && selectedProjectId) {
    const project = projects.find(p => p.id === selectedProjectId);
    return <ProjectDetailsPage
      project={project}
      onBack={() => setCurrentPage('home')}
      onUpdate={handleUpdateProject}
    />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return <HomePage
    projects={projects}
    onCreateClick={() => setCurrentPage('create')}
    onProjectClick={handleProjectClick}
  />;
}

// Home Page Component
function HomePage({ projects, onCreateClick, onProjectClick }) {
  const [activeTab, setActiveTab] = useState('ongoing');
  const filteredProjects = projects.filter(p => p.status === activeTab);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-slate-900">ProjectHub</h1>
              <div className="hidden md:flex items-center gap-1">
                <Button variant={activeTab === 'ongoing' ? 'default' : 'ghost'} onClick={() => setActiveTab('ongoing')} className="gap-2">
                  <Clock className="h-4 w-4" />
                  Ongoing Projects
                </Button>
                <Button variant={activeTab === 'past' ? 'default' : 'ghost'} onClick={() => setActiveTab('past')} className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Past Projects
                </Button>
                <Button variant="ghost" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                  <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">3</span>
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar>
                <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Current" />
                <AvatarFallback>ME</AvatarFallback>
              </Avatar>
            </Button>
          </div>
          <div className="md:hidden flex gap-2 mt-4">
            <Button size="sm" variant={activeTab === 'ongoing' ? 'default' : 'outline'} onClick={() => setActiveTab('ongoing')} className="flex-1">Ongoing</Button>
            <Button size="sm" variant={activeTab === 'past' ? 'default' : 'outline'} onClick={() => setActiveTab('past')} className="flex-1">Past</Button>
            <Button size="sm" variant="outline" className="flex-1">Messages</Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {activeTab === 'ongoing' ? 'Ongoing Projects' : 'Past Projects'}
          </h2>
          <p className="text-slate-600">
            {activeTab === 'ongoing' ? 'Manage and track your active projects' : 'View your completed projects'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors cursor-pointer group" onClick={onCreateClick}>
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] p-6">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <Plus className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Create New Project</h3>
              <p className="text-sm text-slate-500 text-center">Start a new project and invite your team</p>
            </CardContent>
          </Card>

          {filteredProjects.map((project) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => onProjectClick(project.id)}>
              <div className="relative h-48 overflow-hidden bg-slate-200">
                <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${project.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {project.status === 'ongoing' ? 'Active' : 'Completed'}
                  </span>
                </div>
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4" />
                  {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={project.creator.avatar} />
                    <AvatarFallback>{project.creator.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{project.creator.name}</p>
                    <p className="text-xs text-slate-500">Project Leader</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No {activeTab} projects</h3>
            <p className="text-slate-500 mb-6">
              {activeTab === 'ongoing' ? 'Create your first project to get started' : 'Your completed projects will appear here'}
            </p>
            {activeTab === 'ongoing' && (
              <Button className="gap-2" onClick={onCreateClick}>
                <Plus className="h-4 w-4" />
                Create New Project
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Project Details Page
function ProjectDetailsPage({ project, onBack, onUpdate }) {
  const [activeSection, setActiveSection] = useState('menu');
  const [localProject, setLocalProject] = useState(project);

  const handleLocalUpdate = async (updates) => {
    const updated = { ...localProject, ...updates };
    setLocalProject(updated);
    await onUpdate(updated);
  };

  const handleBackClick = () => {
    if (activeSection === 'menu') {
      onBack();
    } else {
      setActiveSection('menu');
    }
  };

  const menuItems = [
    { id: 'overview', title: 'Project Overview', description: 'View project details', icon: Info, color: 'blue' },
    { id: 'timeline', title: 'Timeline & Duration', description: 'Manage dates and deadlines', icon: Calendar, color: 'purple' },
    { id: 'files', title: 'Files & Documents', description: 'Upload and manage files', icon: FolderOpen, color: 'green', badge: localProject.files?.length || 0 },
    { id: 'team', title: 'Team Members', description: 'Manage team and roles', icon: Users, color: 'orange', badge: localProject.teamMembers?.length || 0 },
    { id: 'settings', title: 'Project Settings', description: 'Edit project information', icon: Settings, color: 'slate' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={handleBackClick} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {activeSection === 'menu' ? 'Back to Projects' : 'Back to Menu'}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="overflow-hidden mb-8">
          <div className="relative h-64 bg-gradient-to-br from-slate-200 to-slate-300">
            {localProject.image && <img src={localProject.image} alt={localProject.title} className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">{localProject.title}</h1>
                  <div className="flex items-center gap-4 text-white/90">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border-2 border-white">
                        <AvatarImage src={localProject.creator?.avatar} />
                        <AvatarFallback>{localProject.creator?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{localProject.creator?.name}</span>
                    </div>
                    <span>•</span>
                    <span className="text-sm">{localProject.teamMembers?.length || 0} members</span>
                  </div>
                </div>
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${localProject.status === 'ongoing' ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {localProject.status === 'ongoing' ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {activeSection === 'menu' && <MenuView menuItems={menuItems} onSelectItem={setActiveSection} />}
        {activeSection === 'overview' && <OverviewSection project={localProject} onUpdate={handleLocalUpdate} />}
        {activeSection === 'timeline' && <TimelineSection project={localProject} onUpdate={handleLocalUpdate} />}
        {activeSection === 'files' && <FilesSection project={localProject} onUpdate={handleLocalUpdate} />}
        {activeSection === 'team' && <TeamSection project={localProject} onUpdate={handleLocalUpdate} />}
        {activeSection === 'settings' && <SettingsSection project={localProject} onUpdate={handleLocalUpdate} />}
      </div>
    </div>
  );
}

function MenuView({ menuItems, onSelectItem }) {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
      green: 'bg-green-100 text-green-600 hover:bg-green-200',
      orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
      slate: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    };
    return colors[color];
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Project Management</h2>
        <p className="text-slate-600">Select a section to view and manage project details</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id} className="cursor-pointer hover:shadow-lg transition-all group border-2 hover:border-blue-300" onClick={() => onSelectItem(item.id)}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg ${getColorClasses(item.color)} transition-colors`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge !== undefined && item.badge > 0 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{item.badge}</span>}
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function OverviewSection({ project, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempDescription, setTempDescription] = useState(project.description || '');

  const calculateProgress = () => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const today = new Date();
    const total = end - start;
    const elapsed = today - start;
    return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Project Overview</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-600">Status</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-slate-900">Active</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-600">Progress</CardTitle></CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-slate-900">{calculateProgress()}%</span>
            <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${calculateProgress()}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-slate-600">Team Size</CardTitle></CardHeader>
          <CardContent><span className="text-2xl font-bold text-slate-900">{project.teamMembers?.length || 0}</span></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Description</CardTitle>
            {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <textarea value={tempDescription} onChange={(e) => setTempDescription(e.target.value)} className="w-full p-3 border rounded-lg min-h-32" />
              <div className="flex gap-2">
                <Button onClick={() => { onUpdate({ description: tempDescription }); setIsEditing(false); }}>Save</Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setTempDescription(project.description || ''); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-slate-700">{project.description || 'No description yet'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineSection({ project, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempDates, setTempDates] = useState({ startDate: project.startDate, endDate: project.endDate });

  const calculateDaysRemaining = () => {
    const today = new Date();
    const end = new Date(project.endDate);
    return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  };

  const calculateTotalDays = () => {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Timeline</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Days Remaining</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold text-blue-600">{calculateDaysRemaining()}</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Total Duration</CardTitle></CardHeader>
          <CardContent><span className="text-3xl font-bold">{calculateTotalDays()}</span><span className="text-slate-500 ml-2">days</span></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent><span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">On Track</span></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Project Dates</CardTitle>
            {!isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Start Date</Label><Input type="date" value={tempDates.startDate} onChange={(e) => setTempDates({ ...tempDates, startDate: e.target.value })} /></div>
                <div><Label>End Date</Label><Input type="date" value={tempDates.endDate} onChange={(e) => setTempDates({ ...tempDates, endDate: e.target.value })} /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { onUpdate(tempDates); setIsEditing(false); }}>Save</Button>
                <Button variant="outline" onClick={() => { setIsEditing(false); setTempDates({ startDate: project.startDate, endDate: project.endDate }); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div><p className="text-sm text-slate-600 mb-2">Start Date</p><p className="text-xl font-semibold">{new Date(project.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
              <div><p className="text-sm text-slate-600 mb-2">End Date</p><p className="text-xl font-semibold">{new Date(project.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilesSection({ project, onUpdate }) {
  const deleteFile = async (fileId) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/files?fileId=${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onUpdate({ files: project.files.filter(f => f.id !== fileId) });
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getFileIcon = (type) => {
    if (type === 'pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (type === 'excel') return <File className="h-5 w-5 text-green-600" />;
    return <File className="h-5 w-5 text-slate-600" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Project Files</h2>
        <Button><Upload className="h-4 w-4 mr-2" />Upload</Button>
      </div>
      {project.files?.length > 0 ? (
        <div className="space-y-4">
          {project.files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-lg">{getFileIcon(file.type)}</div>
                  <div>
                    <p className="font-semibold text-lg">{file.name}</p>
                    <p className="text-sm text-slate-500">{file.size} • {file.uploadedBy}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => deleteFile(file.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No files yet</h3>
            <Button><Upload className="h-4 w-4 mr-2" />Upload First File</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeamSection({ project, onUpdate }) {
  const [showInvite, setShowInvite] = useState(false);
  const [memberInput, setMemberInput] = useState('');

  const addMember = async () => {
    if (memberInput.trim()) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(memberInput.trim())) {
        alert('Please enter a valid email address');
        return;
      }

      try {
        const response = await fetch(`/api/projects/${project.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: memberInput.trim() })
        });

        if (response.ok) {
          const newMember = await response.json();
          onUpdate({ teamMembers: [...project.teamMembers, newMember] });
          setMemberInput('');
          setShowInvite(false);
        }
      } catch (error) {
        console.error('Error adding member:', error);
      }
    }
  };

  const removeMember = async (userId) => {
    try {
      const response = await fetch(`/api/projects/${project.id}/members?userId=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onUpdate({ teamMembers: project.teamMembers.filter(m => m.id !== userId) });
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold">Team Members</h2>
        <Button onClick={() => setShowInvite(true)}><UserPlus className="h-4 w-4 mr-2" />Invite</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.teamMembers?.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-6">
              <div className="flex justify-between mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member.name?.[0] || member.email?.[0]}</AvatarFallback>
                </Avatar>
                {member.role !== 'Project Lead' && (
                  <Button variant="ghost" size="icon" onClick={() => removeMember(member.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                )}
              </div>
              <h3 className="font-semibold text-lg">{member.name || member.email}</h3>
              <p className="text-sm text-slate-600">{member.role}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {showInvite && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>Invite Member</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowInvite(false)}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Member Email</Label>
                <Input
                  type="email"
                  placeholder="Enter email..."
                  value={memberInput}
                  onChange={(e) => setMemberInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMember()}
                />
              </div>
              <Button onClick={addMember} className="w-full"><Plus className="h-4 w-4 mr-2" />Add Member</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SettingsSection({ project, onUpdate }) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [tempTitle, setTempTitle] = useState(project.title);
  const [tempImage, setTempImage] = useState(project.image);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/projects/${project.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          window.location.href = '/'; // Redirect to home
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'past' })
      });

      if (response.ok) {
        onUpdate({ status: 'past' });
      }
    } catch (error) {
      console.error('Error archiving project:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Project Settings</h2>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Project Title</CardTitle>
            {!isEditingTitle && <Button variant="outline" size="sm" onClick={() => setIsEditingTitle(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingTitle ? (
            <div className="space-y-4">
              <Input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} className="text-lg" />
              <div className="flex gap-2">
                <Button onClick={() => { onUpdate({ title: tempTitle }); setIsEditingTitle(false); }}>Save</Button>
                <Button variant="outline" onClick={() => { setIsEditingTitle(false); setTempTitle(project.title); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-xl font-semibold">{project.title}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>Cover Image</CardTitle>
            {!isEditingImage && <Button variant="outline" size="sm" onClick={() => setIsEditingImage(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingImage ? (
            <div className="space-y-4">
              <Input value={tempImage} onChange={(e) => setTempImage(e.target.value)} placeholder="Image URL..." />
              {tempImage && <img src={tempImage} alt="Preview" className="w-full h-48 object-cover rounded-lg" />}
              <div className="flex gap-2">
                <Button onClick={() => { onUpdate({ image: tempImage }); setIsEditingImage(false); }}>Save</Button>
                <Button variant="outline" onClick={() => { setIsEditingImage(false); setTempImage(project.image); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <img src={project.image} alt={project.title} className="w-full h-48 object-cover rounded-lg" />
          )}
        </CardContent>
      </Card>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <p className="font-medium">Archive Project</p>
                <p className="text-sm text-slate-600">Move to past projects</p>
              </div>
              <Button variant="outline" className="text-red-600" onClick={handleArchive}>Archive</Button>
            </div>
            <div className="flex justify-between p-4 border border-red-300 rounded-lg bg-red-50">
              <div>
                <p className="font-medium text-red-900">Delete Project</p>
                <p className="text-sm text-red-700">Permanently delete this project</p>
              </div>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Create Project Page
function CreateProjectPage({ onBack, onCreate }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    startDate: '',
    endDate: '',
    teamMembers: []
  });

  const handleNext = () => currentStep < 4 && setCurrentStep(currentStep + 1);
  const handleBack = () => currentStep > 1 && setCurrentStep(currentStep - 1);
  const handleCreate = () => formData.title && formData.startDate && formData.endDate && onCreate(formData);

  const canProceed = () => {
    if (currentStep === 1) return formData.title.trim() !== '';
    if (currentStep === 3) return formData.startDate && formData.endDate;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-8 text-white">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Create New Project</h1>
              <p className="text-blue-100">Step {currentStep} of 4</p>
            </div>

            <div className="flex items-center justify-between">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg transition-all ${currentStep >= step ? 'bg-white text-blue-600 shadow-lg' : 'bg-blue-400/50 text-white'}`}>
                      {step}
                    </div>
                    <span className="text-sm mt-2 font-medium">
                      {step === 1 && 'Title'}
                      {step === 2 && 'Image'}
                      {step === 3 && 'Duration'}
                      {step === 4 && 'Team'}
                    </span>
                  </div>
                  {step < 4 && <div className={`h-1 flex-1 mx-2 rounded transition-all ${currentStep > step ? 'bg-white' : 'bg-blue-400/50'}`} />}
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

          <div className="p-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <Button variant="outline" onClick={currentStep === 1 ? onBack : handleBack} className="gap-2">
              {currentStep === 1 ? <><X className="h-4 w-4" />Cancel</> : <><ChevronLeft className="h-4 w-4" />Back</>}
            </Button>
            <div className="flex items-center gap-2">
              {(currentStep === 2 || currentStep === 4) && <Button variant="ghost" onClick={handleNext}>Skip</Button>}
              <Button onClick={currentStep === 4 ? handleCreate : handleNext} disabled={!canProceed()} className="gap-2">
                {currentStep === 4 ? <><CheckCircle className="h-4 w-4" />Create Project</> : <>Next<ChevronRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step1({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Project Title</h3>
        <p className="text-slate-600 text-sm">Give your project a clear and descriptive name</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" type="text" placeholder="e.g., Office Renovation Project" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="text-lg h-12" autoFocus />
        <p className="text-xs text-slate-500">This will be displayed on the project card</p>
      </div>
    </div>
  );
}

function Step2({ formData, setFormData }) {
  const [imageUrl, setImageUrl] = useState(formData.image || '');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Project Image</h3>
        <p className="text-slate-600 text-sm">Add a cover image for your project (Optional)</p>
      </div>
      {formData.image && (
        <div className="relative rounded-lg overflow-hidden border-2 border-slate-200">
          <img src={formData.image} alt="Preview" className="w-full h-48 object-cover" />
          <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => { setFormData({ ...formData, image: '' }); setImageUrl(''); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-slate-700 font-medium mb-1">Upload project image</p>
          <p className="text-sm text-slate-500 mb-4">PNG, JPG, GIF up to 10MB</p>
          <div className="w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Image className="h-5 w-5 text-slate-400" />
              </div>
              <Input type="text" placeholder="Paste image URL here..." value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setFormData({ ...formData, image: e.target.value }); }} className="pl-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({ formData, setFormData }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Project Duration</h3>
        <p className="text-slate-600 text-sm">Set the start and end dates for your project</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Start Date *</Label>
          <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate" className="flex items-center gap-2"><Calendar className="h-4 w-4" />End Date *</Label>
          <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} min={formData.startDate} className="h-11" />
        </div>
      </div>
      {formData.startDate && formData.endDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900"><strong>Project Duration:</strong> {Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24))} days</p>
        </div>
      )}
    </div>
  );
}

function Step4({ formData, setFormData }) {
  const [memberInput, setMemberInput] = useState('');
  const [inviteLink] = useState(
    () => `https://projecthub.app/invite/${crypto.randomUUID()}`
  );

  const addMember = () => {
    if (memberInput.trim()) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(memberInput.trim())) {
        alert('Please enter a valid email address');
        return;
      }

      // Check for duplicates
      if (formData.teamMembers.some(m => m.email === memberInput.trim())) {
        alert('This email has already been added');
        return;
      }

      setFormData({
        ...formData,
        teamMembers: [
          ...formData.teamMembers,
          {
            email: memberInput.trim()
          }
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
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Invite Team Members</h3>
        <p className="text-slate-600 text-sm">Add team members now or skip and invite them later</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="memberInput">Member Email</Label>
        <div className="flex gap-2">
          <Input
            id="memberInput"
            type="email"
            placeholder="Enter member email..."
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addMember()}
            className="flex-1"
          />
          <Button onClick={addMember} className="gap-2"><Plus className="h-4 w-4" />Add</Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Or share invite link</Label>
        <div className="flex gap-2 items-center p-3 bg-slate-100 rounded-lg border border-slate-200">
          <Link2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <input type="text" value={inviteLink} readOnly className="flex-1 bg-transparent outline-none text-sm text-slate-600 font-mono" />
          <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(inviteLink)}>Copy</Button>
        </div>
      </div>
      {formData.teamMembers.length > 0 ? (
        <div className="space-y-3">
          <Label className="flex items-center gap-2"><Users className="h-4 w-4" />Team Members ({formData.teamMembers.length})</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {formData.teamMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`} />
                    <AvatarFallback>{member.email[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{member.email}</p>
                    <p className="text-xs text-slate-500">Invited</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeMember(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No team members added yet</p>
          <p className="text-xs text-slate-400 mt-1">You can add them later from project settings</p>
        </div>
      )}
    </div>
  );
}