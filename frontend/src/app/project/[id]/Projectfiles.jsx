import React, { useState, useEffect } from 'react';
import {
  X, ArrowLeft, Upload, File, FileText, Image, Video,
  Presentation, Table, Calculator, StickyNote, Plus,
  Download, Trash2, Search, Filter, Loader2, FolderPlus,
  EyeOff, Eye, Users, UserX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authService } from '../../utils/auth';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
// File type categories
const FILE_CATEGORIES = {
  'Excel Files': {
    icon: Table,
    color: 'green',
    extensions: ['.xlsx', '.xls', '.csv'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
  },
  'PDF Documents': {
    icon: FileText,
    color: 'red',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf']
  },
  'Word Documents': {
    icon: FileText,
    color: 'blue',
    extensions: ['.doc', '.docx'],
    mimeTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  },
  'CAD / Drawing Files': {
    icon: File,
    color: 'purple',
    extensions: ['.dwg', '.dxf', '.rvt', '.skp'],
    mimeTypes: ['application/acad', 'application/x-acad', 'application/autocad_dwg', 'image/vnd.dwg', 'image/x-dwg']
  },
  'Image Files': {
    icon: Image,
    color: 'pink',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/svg+xml', 'image/webp']
  },
  'PowerPoint Presentations': {
    icon: Presentation,
    color: 'orange',
    extensions: ['.ppt', '.pptx'],
    mimeTypes: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
  },
  'Calculation & Analysis Files': {
    icon: Calculator,
    color: 'indigo',
    extensions: ['.mat', '.m', '.nb', '.sav', '.xlsm'],
    mimeTypes: ['application/vnd.ms-excel.sheet.macroEnabled.12']
  },
  'Notes': {
    icon: StickyNote,
    color: 'yellow',
    extensions: ['.txt', '.md', '.note'],
    mimeTypes: ['text/plain', 'text/markdown']
  },
  'Video Files': {
    icon: Video,
    color: 'violet',
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv'],
    mimeTypes: ['video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska']
  }
};

const ProjectFiles = ({ projectId, onClose, onBackToDetails, isTeamMember }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All Files');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [selectedDocForVisibility, setSelectedDocForVisibility] = useState(null);
  const [customCategories, setCustomCategories] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadHiddenFromUsers, setUploadHiddenFromUsers] = useState([]);

  // Visibility modal state
  const [visibilityMode, setVisibilityMode] = useState('none'); // 'none', 'all', 'selected'
  const [selectedHiddenUsers, setSelectedHiddenUsers] = useState([]);

  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryExtensions, setNewCategoryExtensions] = useState('');

  useEffect(() => {
    // Get current user ID
    const userId = authService.getUserId();
    setCurrentUserId(userId);

    if (projectId) {
      fetchDocuments();
      fetchCustomCategories();
      fetchProjectMembers();
    }
  }, [projectId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const userId = authService.getUserId();
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(Array.isArray(data.data) ? data.data : []);
      } else {
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomCategories = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/categories?project_id=${projectId}`);
      const data = await response.json();

      if (data.success) {
        const categoriesObj = {};
        data.data.forEach(cat => {
          categoriesObj[cat.name] = {
            icon: File,
            color: cat.color,
            extensions: cat.extensions,
            mimeTypes: cat.mime_types || []
          };
        });
        setCustomCategories(categoriesObj);
      }
    } catch (error) {
      console.error('Error fetching custom categories:', error);
    }
  };

  const fetchProjectMembers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/members`);
      const data = await response.json();

      if (data.success) {
        setProjectMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const categorizeFile = (fileType, fileName) => {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    // Check custom categories first
    for (const [catName, catData] of Object.entries(customCategories)) {
      if (catData.extensions.includes(extension)) {
        return catName;
      }
    }

    // Check predefined categories
    for (const [categoryName, categoryData] of Object.entries(FILE_CATEGORIES)) {
      if (categoryData.extensions.includes(extension) || categoryData.mimeTypes.includes(fileType)) {
        return categoryName;
      }
    }

    return 'Other Files';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadFile(file);
      setUploadTitle(file.name);
      const category = categorizeFile(file.type, file.name);
      setUploadCategory(category);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file to upload');
      return;
    }
    const userId = authService.getUserId();

    if (!userId) {
      alert('User not logged in. Please log in to upload files.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      formData.append('description', uploadDescription);
      formData.append('category', uploadCategory);
      formData.append('uploaded_by', userId);
      formData.append('hidden_from_users', JSON.stringify(uploadHiddenFromUsers));

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success || data.id) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadDescription('');
        setUploadCategory('');
        setUploadHiddenFromUsers([]);
        setVisibilityMode('none');
        setSelectedHiddenUsers([]);
        fetchDocuments();
      } else {
        alert(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId, fileUploadedBy) => {
    // Team members can only delete their own files
    if (isTeamMember && fileUploadedBy !== currentUserId) {
      alert('You can only delete files you uploaded');
      return;
    }

    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files?fileId=${fileId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchDocuments();
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  const handleUpdateVisibility = async (docId, hiddenFromUsers) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/files/${docId}/visibility`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hidden_from_users: hiddenFromUsers
        })
      });

      const data = await response.json();

      if (data.success) {
        fetchDocuments();
        setShowVisibilityModal(false);
        setSelectedDocForVisibility(null);
        setVisibilityMode('none');
        setSelectedHiddenUsers([]);
      } else {
        alert(data.error || 'Failed to update document visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      alert('Failed to update document visibility');
    }
  };

  const handleViewFile = (filePath) => {
    const fileUrl = `http://localhost:5000/${filePath}`;
    window.open(fileUrl, '_blank');
  };

  const handleDownloadFile = async (e, filePath, fileName) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const fileUrl = `http://localhost:5000/${filePath}`;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleDeleteClick = (e, fileId, fileUploadedBy) => {
    e.stopPropagation();
    handleDeleteFile(fileId, fileUploadedBy);
  };

  const handleVisibilityClick = (e, doc) => {
    e.stopPropagation();
    setSelectedDocForVisibility(doc);

    // Determine current visibility mode
    if (doc.hidden_from_users && doc.hidden_from_users.length > 0) {
      if (doc.hidden_from_users.length === projectMembers.length) {
        setVisibilityMode('all');
      } else {
        setVisibilityMode('selected');
        setSelectedHiddenUsers(doc.hidden_from_users);
      }
    } else {
      setVisibilityMode('none');
    }

    setShowVisibilityModal(true);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !newCategoryExtensions) {
      alert('Please fill in all fields');
      return;
    }

    const extensions = newCategoryExtensions.split(',').map(ext => ext.trim().toLowerCase());
    const userId = authService.getUserId();

    if (!userId) {
      alert('User not logged in. Please log in to add categories.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCategoryName,
          extensions: extensions,
          icon: 'File',
          color: 'gray',
          project_id: projectId,
          created_by: userId
        })
      });

      const data = await response.json();

      if (data.success) {
        await fetchCustomCategories();
        setShowAddCategoryModal(false);
        setNewCategoryName('');
        setNewCategoryExtensions('');
        alert('Category created successfully!');
      } else {
        alert(data.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const handleVisibilityModeChange = (mode) => {
    setVisibilityMode(mode);

    if (mode === 'none') {
      setUploadHiddenFromUsers([]);
      setSelectedHiddenUsers([]);
    } else if (mode === 'all') {
      const allMemberIds = projectMembers.map(m => m.userId);
      setUploadHiddenFromUsers(allMemberIds);
      setSelectedHiddenUsers(allMemberIds);
    } else if (mode === 'selected') {
      // Keep current selection
    }
  };

  const handleToggleUserVisibility = (userId) => {
    const currentList = showVisibilityModal ? selectedHiddenUsers : uploadHiddenFromUsers;
    const setter = showVisibilityModal ? setSelectedHiddenUsers : setUploadHiddenFromUsers;

    if (currentList.includes(userId)) {
      setter(currentList.filter(id => id !== userId));
    } else {
      setter([...currentList, userId]);
    }
  };

  const handleSaveVisibility = () => {
    if (selectedDocForVisibility) {
      let hiddenUsers = [];

      if (visibilityMode === 'none') {
        hiddenUsers = [];
      } else if (visibilityMode === 'all') {
        hiddenUsers = projectMembers.map(m => m.userId);
      } else if (visibilityMode === 'selected') {
        hiddenUsers = selectedHiddenUsers;
      }

      handleUpdateVisibility(selectedDocForVisibility.id, hiddenUsers);
    }
  };

  const allCategories = { ...FILE_CATEGORIES, ...customCategories };

  const safeDocuments = Array.isArray(documents) ? documents : [];

  const filteredDocuments = safeDocuments.filter(doc => {
    const matchesSearch = doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'All Files') return matchesSearch;

    const docCategory = categorizeFile(doc.file_type, doc.title);
    return matchesSearch && docCategory === selectedCategory;
  });

  const documentsByCategory = {};
  safeDocuments.forEach(doc => {
    const category = categorizeFile(doc.file_type, doc.title);
    if (!documentsByCategory[category]) {
      documentsByCategory[category] = [];
    }
    documentsByCategory[category].push(doc);
  });

  const getCategoryIcon = (categoryName) => {
    const categoryData = allCategories[categoryName];
    if (categoryData) {
      const IconComponent = categoryData.icon;
      return <IconComponent className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const getCategoryColor = (categoryName) => {
    const categoryData = allCategories[categoryName];
    return categoryData?.color || 'gray';
  };

  const getColorClasses = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-700 border-green-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
      pink: 'bg-pink-100 text-pink-700 border-pink-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      violet: 'bg-violet-100 text-violet-700 border-violet-200',
      gray: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[color] || colors.gray;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVisibilityStatus = (doc) => {
    if (!doc.hidden_from_users || doc.hidden_from_users.length === 0) {
      return { label: 'Visible to all', icon: Eye, color: 'text-green-600' };
    } else if (doc.hidden_from_users.length === projectMembers.length) {
      return { label: 'Hidden from all', icon: EyeOff, color: 'text-amber-600' };
    } else {
      return { label: `Hidden from ${doc.hidden_from_users.length}`, icon: UserX, color: 'text-orange-600' };
    }
  };

  // Check if user can delete a specific file
  const canDeleteFile = (fileUploadedBy) => {
    // Non-team members (leaders) can delete any file
    if (!isTeamMember) return true;
    // Team members can only delete their own files
    return fileUploadedBy === currentUserId;
  };

  // Team members can upload files but not create categories
  const canCreateCategory = !isTeamMember;

  // Only team leaders can manage visibility
  const canManageVisibility = !isTeamMember;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBackToDetails} className="gap-2 text-base">
              <ArrowLeft className="h-5 w-5" />
              Back to Details
            </Button>
            <div className="h-6 w-px bg-slate-300"></div>
            <h1 className="text-2xl font-bold text-slate-900">Project Documents</h1>
            {isTeamMember && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                Team Member
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowUploadModal(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-base font-medium"
            >
              <Upload className="h-5 w-5" />
              Upload Document
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Categories */}
          <div className="w-80 border-r border-slate-200 bg-slate-50 p-6 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Categories</h2>
              {/* Only show Add Category button for non-team members */}
              {canCreateCategory && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddCategoryModal(true)}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('All Files')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
                  selectedCategory === 'All Files'
                    ? 'bg-blue-100 text-blue-900 font-medium'
                    : 'hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5" />
                  <span>All Files</span>
                </div>
                <span className="text-sm font-semibold">{safeDocuments.length}</span>
              </button>

              {Object.entries(allCategories).map(([categoryName, categoryData]) => {
                const count = documentsByCategory[categoryName]?.length || 0;
                const IconComponent = categoryData.icon;

                return (
                  <button
                    key={categoryName}
                    onClick={() => setSelectedCategory(categoryName)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
                      selectedCategory === categoryName
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'hover:bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5" />
                      <span className="text-sm">{categoryName}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-sm font-semibold">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-6 text-base"
                />
              </div>
            </div>

            {/* Documents Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-20">
                <File className="h-20 w-20 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No documents found</h3>
                <p className="text-slate-500 mb-6">
                  {searchQuery ? 'Try adjusting your search' : 'Upload your first document to get started'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowUploadModal(true)} className="gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Document
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map(doc => {
                  const category = categorizeFile(doc.file_type, doc.title);
                  const color = getCategoryColor(category);
                  const canDelete = canDeleteFile(doc.uploaded_by);
                  const visibilityStatus = getVisibilityStatus(doc);

                  return (
                    <Card
                      key={doc.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer relative"
                      onClick={() => handleViewFile(doc.file_path)}
                    >
{/* Visibility Badge */}
{doc.hidden_from_users && doc.hidden_from_users.length > 0 && (
  <div className="absolute top-3 right-3 z-10">
    <div className="text-amber-700 text-xs font-medium flex items-center gap-1">
      {visibilityStatus.icon === EyeOff ? <EyeOff className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
      Restricted
    </div>
  </div>
)}
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className={`p-3 rounded-lg ${getColorClasses(color)} border`}>
                            {getCategoryIcon(category)}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Visibility Toggle - Only for team leaders */}
                            {canManageVisibility && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleVisibilityClick(e, doc)}
                                className={`flex-shrink-0 ${visibilityStatus.color} hover:bg-slate-50`}
                                title="Manage visibility"
                              >
                                <visibilityStatus.icon className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Delete button */}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteClick(e, doc.id, doc.uploaded_by)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base font-semibold text-slate-900 mt-3 line-clamp-2">
                          {doc.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {doc.description && (
                          <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                          <span>{formatDate(doc.created_at)}</span>
                          <span className={`px-2 py-1 rounded ${getColorClasses(color)} text-xs font-medium`}>
                            {category}
                          </span>
                        </div>
                        <Button
                          onClick={(e) => handleDownloadFile(e, doc.file_path, doc.title)}
                          variant="outline"
                          className="w-full gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Upload Document</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowUploadModal(false);
                setVisibilityMode('none');
                setUploadHiddenFromUsers([]);
              }}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select File *
                </label>
                <Input
                  type="file"
                  onChange={handleFileSelect}
                  className="text-base"
                />
                {uploadFile && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document Title *
                </label>
                <Input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Enter document title"
                  className="text-base"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Enter document description (optional)"
                  rows={4}
                  className="text-base resize-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-base"
                >
                  <option value="">Select category</option>
                  {Object.keys(allCategories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Visibility Control - Only for team leaders */}
              {canManageVisibility && projectMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Document Visibility
                  </label>

                  <div className="space-y-3">
                    {/* Visibility Mode Selection */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={visibilityMode === 'none' ? 'default' : 'outline'}
                        onClick={() => handleVisibilityModeChange('none')}
                        className="flex-1 gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Visible to All
                      </Button>
                      <Button
                        type="button"
                        variant={visibilityMode === 'all' ? 'default' : 'outline'}
                        onClick={() => handleVisibilityModeChange('all')}
                        className="flex-1 gap-2"
                      >
                        <EyeOff className="h-4 w-4" />
                        Hide from All
                      </Button>
                      <Button
                        type="button"
                        variant={visibilityMode === 'selected' ? 'default' : 'outline'}
                        onClick={() => handleVisibilityModeChange('selected')}
                        className="flex-1 gap-2"
                      >
                        <Users className="h-4 w-4" />
                        Select Users
                      </Button>
                    </div>

                    {/* User Selection - Only show when 'selected' mode is active */}
                    {visibilityMode === 'selected' && (
                      <div className="border border-slate-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                        <p className="text-sm text-slate-600 mb-3">Select team members to hide this document from:</p>
                        <div className="space-y-2">
                          {projectMembers.map(member => (
                            <label
                              key={member.userId}
                              className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={uploadHiddenFromUsers.includes(member.userId)}
                                onChange={() => handleToggleUserVisibility(member.userId)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div className="flex items-center gap-2">
                                <img
                                  src={member.avatar}
                                  alt={member.name}
                                  className="w-6 h-6 rounded-full"
                                />
                                <span className="text-sm text-slate-700">{member.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info message */}
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
                      {visibilityMode === 'none' && '✓ All team members can see this document'}
                      {visibilityMode === 'all' && '✓ Only project leaders can see this document'}
                      {visibilityMode === 'selected' && uploadHiddenFromUsers.length > 0 &&
                        `✓ Hidden from ${uploadHiddenFromUsers.length} team member${uploadHiddenFromUsers.length > 1 ? 's' : ''}`}
                      {visibilityMode === 'selected' && uploadHiddenFromUsers.length === 0 &&
                        'Select team members to hide from'}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="flex-1 gap-2 py-6 text-base"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Upload Document
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadModal(false);
                    setVisibilityMode('none');
                    setUploadHiddenFromUsers([]);
                  }}
                  className="flex-1 py-6 text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal - Only for non-team members */}
      {showAddCategoryModal && canCreateCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add New Category</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddCategoryModal(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category Name *
                </label>
                <Input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Technical Specifications"
                  className="text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  File Extensions *
                </label>
                <Input
                  type="text"
                  value={newCategoryExtensions}
                  onChange={(e) => setNewCategoryExtensions(e.target.value)}
                  placeholder="e.g., .spec, .tech, .doc"
                  className="text-base"
                />
                <p className="mt-2 text-sm text-slate-500">
                  Enter extensions separated by commas (e.g., .spec, .tech)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleAddCategory}
                  className="flex-1 gap-2 py-6 text-base"
                >
                  <FolderPlus className="h-5 w-5" />
                  Add Category
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1 py-6 text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Management Modal */}
      {showVisibilityModal && selectedDocForVisibility && canManageVisibility && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Manage Document Visibility</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowVisibilityModal(false);
                setSelectedDocForVisibility(null);
                setVisibilityMode('none');
                setSelectedHiddenUsers([]);
              }}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Document Info */}
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                <File className="h-5 w-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {selectedDocForVisibility.title}
                  </h3>
                  {selectedDocForVisibility.description && (
                    <p className="text-sm text-slate-600">
                      {selectedDocForVisibility.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Visibility Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Who can see this document?
                </label>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={visibilityMode === 'none' ? 'default' : 'outline'}
                      onClick={() => handleVisibilityModeChange('none')}
                      className="flex-1 gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      All Team Members
                    </Button>
                    <Button
                      type="button"
                      variant={visibilityMode === 'all' ? 'default' : 'outline'}
                      onClick={() => handleVisibilityModeChange('all')}
                      className="flex-1 gap-2"
                    >
                      <EyeOff className="h-4 w-4" />
                      Leaders Only
                    </Button>
                    <Button
                      type="button"
                      variant={visibilityMode === 'selected' ? 'default' : 'outline'}
                      onClick={() => handleVisibilityModeChange('selected')}
                      className="flex-1 gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Select Users
                    </Button>
                  </div>

                  {/* User Selection */}
                  {visibilityMode === 'selected' && (
                    <div className="border border-slate-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <p className="text-sm text-slate-600 mb-3 font-medium">Hide document from:</p>
                      <div className="space-y-2">
                        {projectMembers.map(member => (
                          <label
                            key={member.userId}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedHiddenUsers.includes(member.userId)}
                              onChange={() => handleToggleUserVisibility(member.userId)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <span className="text-sm font-medium text-slate-700 block">{member.name}</span>
                                <span className="text-xs text-slate-500">{member.email}</span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      {visibilityMode === 'none' && '✓ This document will be visible to all team members'}
                      {visibilityMode === 'all' && '✓ Only project leaders will be able to see and access this document'}
                      {visibilityMode === 'selected' && selectedHiddenUsers.length > 0 &&
                        `✓ This document will be hidden from ${selectedHiddenUsers.length} selected team member${selectedHiddenUsers.length > 1 ? 's' : ''}`}
                      {visibilityMode === 'selected' && selectedHiddenUsers.length === 0 &&
                        'Select team members to restrict access'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveVisibility}
                  className="flex-1 gap-2 py-6 text-base"
                >
                  <Eye className="h-5 w-5" />
                  Save Visibility Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVisibilityModal(false);
                    setSelectedDocForVisibility(null);
                    setVisibilityMode('none');
                    setSelectedHiddenUsers([]);
                  }}
                  className="flex-1 py-6 text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFiles;