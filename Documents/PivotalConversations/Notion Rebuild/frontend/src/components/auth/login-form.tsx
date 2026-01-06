'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, Building2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<'team' | 'client'>('team');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: userType === 'team' ? password : undefined,
          userType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect to intended page or default
      const from = searchParams.get('from');
      router.push(from || data.redirect || '/');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
        <CardDescription className="text-zinc-400">
          Sign in to access your workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={userType} onValueChange={(v) => setUserType(v as 'team' | 'client')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800">
            <TabsTrigger value="team" className="data-[state=active]:bg-zinc-700 gap-2">
              <Users className="w-4 h-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="client" className="data-[state=active]:bg-zinc-700 gap-2">
              <Building2 className="w-4 h-4" />
              Client
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={userType === 'team' ? 'yourname@pivotalconversations.ai' : 'your@email.com'}
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {userType === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-zinc-200"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          {userType === 'client' && (
            <p className="text-xs text-zinc-500 text-center mt-4">
              Clients can sign in with just their email address.
              Contact your account manager if you need access.
            </p>
          )}

          {userType === 'team' && (
            <p className="text-sm text-zinc-500 text-center mt-4">
              New team member?{' '}
              <Link href="/signup" className="text-white hover:underline">
                Create an account
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
