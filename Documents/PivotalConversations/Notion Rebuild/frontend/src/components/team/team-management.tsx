'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  UserPlus,
  Clock,
  Shield,
  Mail,
  Briefcase,
  Check,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { InviteTeamMember } from './invite-team-member';
import type { TeamRole, TeamCategory, WorkspaceType } from '@/types';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
  teamRole?: TeamRole;
  team?: TeamCategory[];
  workspaceType: WorkspaceType;
  isAdmin: boolean;
  isHardcoded?: boolean;
}

interface PendingInvite {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string[];
  workspaceType: string;
  createdAt: string;
}

interface TeamManagementProps {
  members: TeamMember[];
  isAdmin: boolean;
}

// Protected emails that cannot be deleted (core team)
const PROTECTED_EMAILS = [
  'natasha@pivotalconversations.ai',
  'kyle@pivotalconversations.io',
  'eddie@pivotalconversations.ai',
  'vansh@pivotalconversations.io',
  'olivia@pivotalconversations.io',
];

export function TeamManagement({ members: initialMembers, isAdmin }: TeamManagementProps) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch pending invites
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
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchInvites();
    }
  }, [isAdmin]);

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

  const handleDeleteMember = async () => {
    if (!deletingMember || deleteConfirmText !== 'DELETE') return;

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/team/members/${deletingMember.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Failed to delete member');
        return;
      }

      // Remove from local state
      setMembers(prev => prev.filter(m => m.id !== deletingMember.id));
      setDeletingMember(null);
      setDeleteConfirmText('');
      router.refresh();
    } catch (error) {
      setDeleteError('An error occurred');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInviteSent = () => {
    fetchInvites();
    router.refresh();
  };

  const getRoleBadgeColor = (role?: string) => {
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

  const canDeleteMember = (member: TeamMember) => {
    // Cannot delete protected (core team) members
    if (PROTECTED_EMAILS.some(e => e.toLowerCase() === member.email.toLowerCase())) {
      return false;
    }
    // Cannot delete hardcoded members
    if (member.id?.startsWith('team-member-')) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      {isAdmin && (
        <div className="flex justify-end">
          <InviteTeamMember onInviteSent={handleInviteSent} />
        </div>
      )}

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="bg-zinc-800">
          <TabsTrigger value="active" className="data-[state=active]:bg-zinc-700">
            <Users className="w-4 h-4 mr-2" />
            Active Members ({members.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="pending" className="data-[state=active]:bg-zinc-700">
              <Clock className="w-4 h-4 mr-2" />
              Pending Invites ({invites.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Active Members Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Team Members</CardTitle>
              <CardDescription className="text-zinc-400">
                All active team members with dashboard access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{member.name}</span>
                        {member.isAdmin && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            member.workspaceType === 'full_dashboard'
                              ? 'text-green-400 border-green-500/30'
                              : 'text-zinc-400 border-zinc-600'
                          }
                        >
                          {member.workspaceType === 'full_dashboard' ? 'Full Access' : 'Team Access'}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {member.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {member.teamRole && (
                          <Badge className={getRoleBadgeColor(member.teamRole)}>
                            <Briefcase className="w-3 h-3 mr-1" />
                            {member.teamRole}
                          </Badge>
                        )}
                        {member.team?.map((t) => (
                          <Badge key={t} variant="outline" className="text-zinc-400 border-zinc-600 text-xs">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {isAdmin && canDeleteMember(member) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingMember(member)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Invites Tab */}
        {isAdmin && (
          <TabsContent value="pending" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Pending Invites</CardTitle>
                <CardDescription className="text-zinc-400">
                  Team members who haven't activated their accounts yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingInvites ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                  </div>
                ) : invites.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-500">No pending invites</p>
                    <p className="text-sm text-zinc-600 mt-1">
                      Use the "Invite Team Member" button to add new members
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-amber-500/20"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{invite.name}</span>
                            <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Activation
                            </Badge>
                          </div>
                          <p className="text-sm text-zinc-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {invite.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {invite.role && (
                              <Badge className={getRoleBadgeColor(invite.role)}>
                                {invite.role}
                              </Badge>
                            )}
                            {invite.team.map((t) => (
                              <Badge key={t} variant="outline" className="text-zinc-400 border-zinc-600 text-xs">
                                {t}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-zinc-600 mt-1">
                            Invited {new Date(invite.createdAt).toLocaleDateString()}
                          </p>
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
                            <>
                              <Trash2 className="w-4 h-4 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Member Dialog */}
      <Dialog open={!!deletingMember} onOpenChange={(open) => {
        if (!open) {
          setDeletingMember(null);
          setDeleteConfirmText('');
          setDeleteError('');
        }
      }}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Remove Team Member
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently remove <span className="text-white font-medium">{deletingMember?.name}</span> from the team.
              They will lose access to the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {deleteError}
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
                setDeletingMember(null);
                setDeleteConfirmText('');
                setDeleteError('');
              }}
              className="text-zinc-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteMember}
              disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
