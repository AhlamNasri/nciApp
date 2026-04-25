'use client'
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Camera, Upload, X, Loader2, Mail, User, Shield, Calendar, Lock, Eye, EyeOff } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ProfilePage({
  userAvatar,
  userName,
  userEmail,
  currentUserId,
  userRole,
  onBack,
  onAvatarUpdate
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(userName);
  const [editedEmail, setEditedEmail] = useState(userEmail);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const fileInputRef = useRef(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const getRoleName = (roleId) => {
    if (roleId === 1) return 'Project Manager';
    if (roleId === 2) return 'Team Member';
    return 'User';
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${currentUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedName,
          email: editedEmail
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setIsEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert('Failed to update profile: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users/${currentUserId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Password changed successfully!');
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
      } else {
        alert('Failed to change password: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error changing password:', err);
      alert('Failed to change password: ' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
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
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Button>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header Card */}
          <Card className="overflow-hidden shadow-lg border-border mb-6 bg-card/90 backdrop-blur-sm">
            <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5"></div>
            <CardContent className="relative pt-0 pb-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 mb-6">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-card shadow-xl">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                      {userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'ME'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10 shadow-lg bg-primary hover:bg-primary/90"
                    onClick={() => setShowAvatarUpload(true)}
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl font-bold text-foreground mb-1">{userName}</h1>
                  <p className="text-muted-foreground mb-2">{userEmail}</p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Shield className="h-4 w-4" />
                    {getRoleName(userRole)}
                  </div>
                </div>

                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => {
                    if (isEditing) {
                      setEditedName(userName);
                      setEditedEmail(userEmail);
                    }
                    setIsEditing(!isEditing);
                  }}
                  className="gap-2"
                >
                  {isEditing ? (
                    <>
                      <X className="h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information Card */}
          <Card className="shadow-lg border-border mb-6 bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                {isEditing ? 'Update your personal information' : 'View your account details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Full Name
                </Label>
                {isEditing ? (
                  <Input
                    id="name"
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-11"
                  />
                ) : (
                  <div className="h-11 px-3 py-2 rounded-md border border-border bg-muted/30 flex items-center">
                    <span className="text-foreground">{userName}</span>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Address
                </Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="h-11"
                  />
                ) : (
                  <div className="h-11 px-3 py-2 rounded-md border border-border bg-muted/30 flex items-center">
                    <span className="text-foreground">{userEmail}</span>
                  </div>
                )}
              </div>

              {/* Role Field (Read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Role
                </Label>
                <div className="h-11 px-3 py-2 rounded-md border border-border bg-muted/30 flex items-center">
                  <span className="text-foreground">{getRoleName(userRole)}</span>
                </div>
              </div>

              {/* User ID (Read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  User ID
                </Label>
                <div className="h-11 px-3 py-2 rounded-md border border-border bg-muted/30 flex items-center">
                  <span className="text-foreground font-mono text-sm">{currentUserId}</span>
                </div>
              </div>

              {/* Save Button (only shown when editing) */}
              {isEditing && (
                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving || !editedName.trim() || !editedEmail.trim()}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Settings Card */}
          <Card className="shadow-lg border-border bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowPasswordChange(true)}
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => !uploadingAvatar && setShowAvatarUpload(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
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

      {/* Change Password Modal */}
      {showPasswordChange && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={() => !changingPassword && setShowPasswordChange(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Change Password</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    disabled={changingPassword}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-10"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-10"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-11 w-10"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-foreground mb-1">Password requirements:</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li className={newPassword.length >= 6 ? 'text-green-600' : ''}>
                      • At least 6 characters
                    </li>
                    <li className={newPassword === confirmPassword && newPassword !== '' ? 'text-green-600' : ''}>
                      • Passwords must match
                    </li>
                  </ul>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleChangePassword}
                  disabled={
                    changingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    newPassword !== confirmPassword ||
                    newPassword.length < 6
                  }
                  className="w-full gap-2"
                  size="lg"
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}