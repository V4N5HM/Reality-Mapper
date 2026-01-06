'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Check, Mail } from 'lucide-react';

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      // Success - show message and redirect to login
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">Account Activated!</h3>
            <p className="text-zinc-400">
              Your account has been activated successfully. Redirecting to login...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-white">Activate Your Account</CardTitle>
        <CardDescription className="text-zinc-400">
          Set your password to complete your account setup
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="text-zinc-300 font-medium">Invite Required</p>
                <p className="text-zinc-500">
                  You must be invited by an admin before you can activate your account.
                  Contact your team lead if you haven't received an invite.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@pivotalconversations.ai"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <p className="text-xs text-zinc-500">
              Enter the email address that was invited
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-white text-black hover:bg-zinc-200"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              'Activate Account'
            )}
          </Button>

          <p className="text-sm text-zinc-500 text-center">
            Already activated?{' '}
            <Link href="/login" className="text-white hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
