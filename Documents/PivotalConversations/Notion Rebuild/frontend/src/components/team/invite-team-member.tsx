'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Trash2, Clock, Check, X } from 'lucide-react';
import type { TeamRole, TeamCategory, WorkspaceType } from '@/types';

const TEAM_ROLES: TeamRole[] = ['Coordinator', 'Short Form Manager', 'YouTube Manager', 'Editor'];
const TEAM_CATEGORIES: TeamCategory[] = ['Podcast', 'Personal Brand', 'Social Media', 'Production', 'Advertising'];

interface PendingInvite {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string[];
  workspaceType: string;
  createdAt: string;
}

interface InviteTeamMemberProps {
  onInviteSent?: () => void;
}

export function InviteTeamMember({ onInviteSent }: InviteTeamMemberProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole | ''>('');
  const [selectedTeams, setSelectedTeams] = useState<TeamCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toggleTeam = (team: TeamCategory) => {
    setSelectedTeams(prev =>
      prev.includes(team)
        ? prev.filter(t => t !== team)
        : [...prev, team]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          ...(role && { role }),
          team: selectedTeams,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send invite');
        return;
      }

      setSuccess(data.message);
      // Reset form
      setName('');
      setEmail('');
      setRole('');
      setSelectedTeams([]);

      // Close dialog after short delay
      setTimeout(() => {
        setOpen(false);
        setSuccess('');
        onInviteSent?.();
      }, 1500);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-white text-black hover:bg-zinc-200">
        <UserPlus className="w-4 h-4 mr-2" />
        Invite Team Member
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Add their details. They'll receive instructions to activate their account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="inviteName" className="text-zinc-300">Full Name</Label>
              <Input
                id="inviteName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteEmail" className="text-zinc-300">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="inviteRole" className="text-zinc-300">
                Role <span className="text-zinc-500 font-normal">(optional)</span>
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select role (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {TEAM_ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="text-white hover:bg-zinc-700">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Team(s)</Label>
              <p className="text-xs text-zinc-500">
                Personal Brand team gets full dashboard access
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {TEAM_CATEGORIES.map((team) => (
                  <button
                    key={team}
                    type="button"
                    onClick={() => toggleTeam(team)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedTeams.includes(team)
                        ? 'bg-white text-black'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-white text-black hover:bg-zinc-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invite'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Component to display pending invites
export function PendingInvites() {
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchInvites = async () => {
    try {
      const res = await fetch('/api/team/invite');
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/team/invite?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInvites(prev => prev.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Error revoking invite:', error);
    } finally {
      setRevokingId(null);
    }
  };

  // Fetch on mount
  useState(() => {
    fetchInvites();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        No pending invites
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{invite.name}</span>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            <p className="text-sm text-zinc-400">{invite.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-zinc-700 text-zinc-300">{invite.role}</Badge>
              {invite.team.map((t) => (
                <Badge key={t} variant="outline" className="text-zinc-400 border-zinc-600 text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => revokeInvite(invite.id)}
            disabled={revokingId === invite.id}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            {revokingId === invite.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
