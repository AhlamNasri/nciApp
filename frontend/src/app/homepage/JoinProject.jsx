'use client'
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Users } from 'lucide-react';
import { authService } from '../utils/auth';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '/api';
export default function JoinProject({ inviteCode, onBack, onSuccess }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      window.location.href = '/';
      return;
    }

    if (inviteCode) {
      verifyInviteLink();
    }
  }, [inviteCode]);

  const verifyInviteLink = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details using invite code
      const response = await fetch(`${API_BASE_URL}/projects/invite/${inviteCode}`);

      if (!response.ok) {
        throw new Error('Invalid invite link');
      }

      const data = await response.json();

      if (data.success) {
        setProject(data.data);
      } else {
        setError(data.error || 'Invalid invite link');
      }
    } catch (err) {
      console.error('Error verifying invite:', err);
      setError('Invalid or expired invite link');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async () => {
    try {
      setJoining(true);
      setError(null);

      const userId = authService.getUserId();

      const response = await fetch(`${API_BASE_URL}/projects/join/${inviteCode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(data.data.projectId);
          } else {
            router.push('/dashboard');
          }
        }, 2000);
      } else {
        setError(data.error || 'Failed to join project');
      }
    } catch (err) {
      console.error('Error joining project:', err);
      setError('Failed to join project. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying invite link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/backk.png)',
          filter: 'blur(2px)',
          transform: 'scale(1.1)'
        }}
      />
      <div className="fixed inset-0 z-0 bg-background/40" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {onBack && (
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4 gap-2"
              disabled={joining}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                success ? 'bg-green-100' : error ? 'bg-red-100' : 'bg-primary/10'
              }`}>
                {success ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : error ? (
                  <XCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <Users className="h-8 w-8 text-primary" />
                )}
              </div>

              <CardTitle>
                {success ? 'Welcome to the Team!' : error ? 'Unable to Join' : 'Join Project'}
              </CardTitle>

              <CardDescription>
                {success
                  ? 'You have successfully joined the project'
                  : error
                  ? error
                  : 'You\'ve been invited to collaborate'
                }
              </CardDescription>
            </CardHeader>

            {!error && !success && project && (
              <CardContent className="space-y-6">
                {/* Project Info */}
                <div className="space-y-4">
                  {project.image && (
                    <div className="relative h-32 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={`http://localhost:5000${project.image}`}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{project.title}</h3>
                    {project.description && (
                      <p className="text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {project.creator.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{project.creator.name}</p>
                      <p className="text-xs text-muted-foreground">Project Lead</p>
                    </div>
                  </div>

                  {project.memberCount > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{project.memberCount} team member{project.memberCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleJoinProject}
                  disabled={joining}
                  className="w-full gap-2"
                  size="lg"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Join Project
                    </>
                  )}
                </Button>
              </CardContent>
            )}

            {success && (
              <CardContent>
                <p className="text-center text-sm text-muted-foreground mb-4">
                  Redirecting to your dashboard...
                </p>
              </CardContent>
            )}

            {error && (
              <CardContent>
                <Button
                  onClick={onBack || (() => router.push('/dashboard'))}
                  variant="outline"
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}