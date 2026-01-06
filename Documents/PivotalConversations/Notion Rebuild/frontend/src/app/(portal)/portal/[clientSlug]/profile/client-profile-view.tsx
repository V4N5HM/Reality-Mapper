'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, User, Mail, Key, Check, AlertCircle } from 'lucide-react';

interface ClientProfileViewProps {
  clientSlug: string;
  clientName: string;
  clientEmail: string;
  hasPassword: boolean;
  isTeamMember: boolean;
}

export function ClientProfileView({
  clientSlug,
  clientName,
  clientEmail,
  hasPassword,
  isTeamMember,
}: ClientProfileViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/portal/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-zinc-400">Manage your account settings</p>
      </div>

      {/* Account Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Your account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-zinc-400">Name</Label>
              <div className="p-3 bg-zinc-800 rounded-lg text-white">
                {clientName}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Email</Label>
              <div className="p-3 bg-zinc-800 rounded-lg text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-500" />
                {clientEmail}
              </div>
            </div>
          </div>
          {isTeamMember && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                You are viewing this portal as a team member. Password changes here affect the client account, not your team account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password - Only show if not a team member viewing */}
      {!isTeamMember && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              {hasPassword ? 'Change Password' : 'Set Password'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {hasPassword
                ? 'Update your password to keep your account secure'
                : 'Set a password to secure your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2 text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  Password updated successfully!
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-zinc-300">
                    Current Password
                  </Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-zinc-300">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              <Button
                type="submit"
                className="bg-white text-black hover:bg-zinc-200"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  hasPassword ? 'Update Password' : 'Set Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
