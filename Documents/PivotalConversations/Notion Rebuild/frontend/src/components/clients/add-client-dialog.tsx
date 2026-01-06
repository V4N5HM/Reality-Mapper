'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { ClientStatus, Package } from '@/types';

const CLIENT_STATUSES: ClientStatus[] = ['Active', 'Onboarding', 'Paused', 'Churned'];

export function AddClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ClientStatus>('Onboarding');
  const [packageId, setPackageId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [slackChannel, setSlackChannel] = useState('');

  // Load packages when dialog opens
  useEffect(() => {
    if (open && packages.length === 0) {
      setLoadingPackages(true);
      fetch('/api/packages')
        .then((res) => res.json())
        .then((data) => {
          setPackages(data);
        })
        .catch((err) => {
          console.error('Failed to load packages:', err);
        })
        .finally(() => {
          setLoadingPackages(false);
        });
    }
  }, [open, packages.length]);

  const resetForm = () => {
    setName('');
    setStatus('Onboarding');
    setPackageId('');
    setStartDate('');
    setSlackChannel('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Client name is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          status,
          packageId: packageId || undefined,
          startDate: startDate || undefined,
          slackChannel: slackChannel.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create client');
      }

      // Success - close dialog and refresh
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-white">Add New Client</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a new client in your workspace
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Client Name */}
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-zinc-300">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter client name"
                className="bg-zinc-800 border-zinc-700 text-white"
                disabled={loading}
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status" className="text-zinc-300">
                Status
              </Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ClientStatus)}
                disabled={loading}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {CLIENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-white">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Package */}
            <div className="grid gap-2">
              <Label htmlFor="package" className="text-zinc-300">
                Package
              </Label>
              <Select
                value={packageId}
                onValueChange={setPackageId}
                disabled={loading || loadingPackages}
              >
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder={loadingPackages ? "Loading..." : "Select package (optional)"} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="none" className="text-zinc-400">
                    No package
                  </SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id} className="text-white">
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="grid gap-2">
              <Label htmlFor="startDate" className="text-zinc-300">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                disabled={loading}
              />
            </div>

            {/* Slack Channel */}
            <div className="grid gap-2">
              <Label htmlFor="slackChannel" className="text-zinc-300">
                Slack Channel
              </Label>
              <Input
                id="slackChannel"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                placeholder="#client-channel"
                className="bg-zinc-800 border-zinc-700 text-white"
                disabled={loading}
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
