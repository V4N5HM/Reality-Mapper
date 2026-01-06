'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Mail, Shield, Users, Briefcase, Lock, Edit, Loader2, Check, Trash2, AlertTriangle, Mic, Download, Link, Unlink } from 'lucide-react';
import type { TeamRole, TeamCategory, WorkspaceType } from '@/types';

interface FirefliesUser {
  id: string;
  name: string;
  email: string;
  transcriptCount: number;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  roles: string[];
  teamRole?: TeamRole;
  team?: TeamCategory[];
  workspaceType: WorkspaceType;
  isAdmin: boolean;
  firefliesUserId?: string | null;
  firefliesUserName?: string | null;
}

interface ProfileViewProps {
  profile: ProfileData;
}

export function ProfileView({ profile }: ProfileViewProps) {
  const router = useRouter();
  const [editName, setEditName] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [name, setName] = useState(profile.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Fireflies state
  const [firefliesUsers, setFirefliesUsers] = useState<FirefliesUser[]>([]);
  const [firefliesUsersLoading, setFirefliesUsersLoading] = useState(false);
  const [linkedFirefliesUserId, setLinkedFirefliesUserId] = useState(profile.firefliesUserId || null);
  const [linkedFirefliesUserName, setLinkedFirefliesUserName] = useState(profile.firefliesUserName || null);
  const [firefliesLinkDialog, setFirefliesLinkDialog] = useState(false);
  const [selectedFirefliesUser, setSelectedFirefliesUser] = useState<string>('');
  const [firefliesError, setFirefliesError] = useState('');
  const [firefliesSuccess, setFirefliesSuccess] = useState('');
  const [firefliesLoading, setFirefliesLoading] = useState(false);
  const [importingTranscripts, setImportingTranscripts] = useState(false);

  // Fetch Fireflies users when dialog opens
  useEffect(() => {
    if (firefliesLinkDialog && firefliesUsers.length === 0) {
      fetchFirefliesUsers();
    }
  }, [firefliesLinkDialog]);

  const fetchFirefliesUsers = async () => {
    setFirefliesUsersLoading(true);
    try {
      const res = await fetch('/api/profile/fireflies/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setFirefliesUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to fetch Fireflies users:', err);
    } finally {
      setFirefliesUsersLoading(false);
    }
  };

  const handleUpdateName = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update name');
        return;
      }

      setSuccess('Name updated successfully');
      setEditName(false);
      router.refresh();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess('Password changed successfully');
      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/profile', {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete account');
        return;
      }

      // Redirect to login page after deletion
      router.push('/login');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkFireflies = async () => {
    if (!selectedFirefliesUser) {
      setFirefliesError('Please select your Fireflies account');
      return;
    }

    setFirefliesLoading(true);
    setFirefliesError('');

    try {
      const selectedUser = firefliesUsers.find(u => u.id === selectedFirefliesUser);
      const res = await fetch('/api/profile/fireflies/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firefliesUserId: selectedFirefliesUser,
          firefliesUserName: selectedUser?.name || '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFirefliesError(data.error || 'Failed to link Fireflies account');
        return;
      }

      setLinkedFirefliesUserId(selectedFirefliesUser);
      setLinkedFirefliesUserName(selectedUser?.name || null);
      setFirefliesSuccess('Fireflies account linked successfully');
      setFirefliesLinkDialog(false);
      setSelectedFirefliesUser('');
      router.refresh();
    } catch (err) {
      setFirefliesError('An error occurred');
    } finally {
      setFirefliesLoading(false);
    }
  };

  const handleUnlinkFireflies = async () => {
    setFirefliesLoading(true);
    setFirefliesError('');

    try {
      const res = await fetch('/api/profile/fireflies/team', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        setFirefliesError(data.error || 'Failed to unlink Fireflies account');
        return;
      }

      setLinkedFirefliesUserId(null);
      setLinkedFirefliesUserName(null);
      setFirefliesSuccess('Fireflies account unlinked');
      router.refresh();
    } catch (err) {
      setFirefliesError('An error occurred');
    } finally {
      setFirefliesLoading(false);
    }
  };

  const handleImportTranscripts = async () => {
    setImportingTranscripts(true);
    setFirefliesError('');
    setFirefliesSuccess('');

    try {
      const res = await fetch('/api/profile/fireflies/team', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setFirefliesError(data.error || 'Failed to import transcripts');
        return;
      }

      setFirefliesSuccess(`Imported ${data.imported || 0} transcripts as case notes`);
      router.refresh();
    } catch (err) {
      setFirefliesError('An error occurred during import');
    } finally {
      setImportingTranscripts(false);
    }
  };

  const getRoleBadgeColor = (role?: TeamRole) => {
    switch (role) {
      case 'Coordinator':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Short Form Manager':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'YouTube Manager':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Editor':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Your account details and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Name */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-400">Name</p>
                <p className="text-white font-medium">{profile.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditName(true)}
              className="text-zinc-400 hover:text-white"
            >
              <Edit className="w-4 h-4" />
            </Button>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
            <Mail className="w-5 h-5 text-zinc-400" />
            <div>
              <p className="text-sm text-zinc-400">Email</p>
              <p className="text-white font-medium">{profile.email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
            <Briefcase className="w-5 h-5 text-zinc-400" />
            <div>
              <p className="text-sm text-zinc-400">Role</p>
              <div className="flex items-center gap-2 mt-1">
                {profile.teamRole ? (
                  <Badge className={getRoleBadgeColor(profile.teamRole)}>
                    {profile.teamRole}
                  </Badge>
                ) : (
                  <span className="text-zinc-500">No role assigned</span>
                )}
                {profile.isAdmin && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                    Admin
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Team */}
          <div className="flex items-center gap-3 py-3 border-b border-zinc-800">
            <Users className="w-5 h-5 text-zinc-400" />
            <div>
              <p className="text-sm text-zinc-400">Team(s)</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {profile.team && profile.team.length > 0 ? (
                  profile.team.map((t) => (
                    <Badge key={t} variant="outline" className="text-zinc-300 border-zinc-700">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-zinc-500">No teams assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Workspace Type */}
          <div className="flex items-center gap-3 py-3">
            <Shield className="w-5 h-5 text-zinc-400" />
            <div>
              <p className="text-sm text-zinc-400">Access Level</p>
              <p className="text-white font-medium">
                {profile.workspaceType === 'full_dashboard'
                  ? 'Full Dashboard Access'
                  : 'Team Workspace'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Security
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Manage your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setChangePassword(true)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Fireflies Integration Card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Fireflies Integration
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Link your Fireflies account to import your meeting transcripts as case notes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {firefliesSuccess && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {firefliesSuccess}
            </div>
          )}
          {firefliesError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {firefliesError}
            </div>
          )}

          {/* Link Status */}
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="text-sm text-zinc-400">Linked Account</p>
                {linkedFirefliesUserId ? (
                  <p className="text-green-400 font-medium flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {linkedFirefliesUserName || 'Connected'}
                  </p>
                ) : (
                  <p className="text-zinc-500">Not linked</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {linkedFirefliesUserId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlinkFireflies}
                  disabled={firefliesLoading}
                  className="border-red-900/50 text-red-400 hover:bg-red-900/20"
                >
                  {firefliesLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unlink className="w-4 h-4 mr-2" />
                      Unlink
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setFirefliesLinkDialog(true)}
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  <Link className="w-4 h-4 mr-2" />
                  Link Account
                </Button>
              )}
            </div>
          </div>

          {/* Import Section - Only show if linked */}
          {linkedFirefliesUserId && (
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-white font-medium">Import Your Transcripts</p>
                <p className="text-sm text-zinc-500">
                  Import your recent meeting transcripts as case notes
                </p>
              </div>
              <Button
                onClick={handleImportTranscripts}
                disabled={importingTranscripts}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {importingTranscripts ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Meetings
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="bg-zinc-900 border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Delete Account</p>
              <p className="text-sm text-zinc-500">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setDeleteAccount(true)}
              className="border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Name Dialog */}
      <Dialog open={editName} onOpenChange={setEditName}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Name</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Update your display name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setEditName(false)}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateName}
              disabled={loading || !name.trim()}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePassword} onOpenChange={setChangePassword}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Change Password</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-zinc-300">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-zinc-300">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setChangePassword(false);
                setError('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={loading || !newPassword || !confirmPassword}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccount} onOpenChange={(open) => {
        setDeleteAccount(open);
        if (!open) {
          setDeleteConfirmText('');
          setError('');
        }
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This action cannot be undone. Your account and all associated data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <p className="text-sm text-zinc-300 mb-2">
                To confirm deletion, type <span className="font-mono font-bold text-red-400">DELETE</span> below:
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="bg-zinc-800 border-zinc-700 text-white font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteAccount(false);
                setDeleteConfirmText('');
                setError('');
              }}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              disabled={loading || deleteConfirmText !== 'DELETE'}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fireflies Link Dialog */}
      <Dialog open={firefliesLinkDialog} onOpenChange={(open) => {
        setFirefliesLinkDialog(open);
        if (!open) {
          setSelectedFirefliesUser('');
          setFirefliesError('');
        }
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Link Fireflies Account
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select your account from the team Fireflies workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {firefliesError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {firefliesError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="firefliesUser" className="text-zinc-300">Your Fireflies Account</Label>
              {firefliesUsersLoading ? (
                <div className="flex items-center gap-2 text-zinc-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading accounts...
                </div>
              ) : (
                <Select value={selectedFirefliesUser} onValueChange={setSelectedFirefliesUser}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select your account" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {firefliesUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id} className="text-white hover:bg-zinc-700">
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-zinc-400">{user.email} ({user.transcriptCount} transcripts)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-zinc-500">
                Only your meeting transcripts will be imported
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setFirefliesLinkDialog(false);
                setSelectedFirefliesUser('');
                setFirefliesError('');
              }}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkFireflies}
              disabled={firefliesLoading || !selectedFirefliesUser}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {firefliesLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Link Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
