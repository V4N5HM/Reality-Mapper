'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Users, Building2, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type');
  const emailFromUrl = searchParams.get('email');

  const [userType, setUserType] = useState<'team' | 'client'>(
    typeFromUrl === 'client' ? 'client' : 'team'
  );
  const [email, setEmail] = useState(emailFromUrl || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeFromUrl === 'client') {
      setUserType('client');
    }
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [typeFromUrl, emailFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          userType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }

      setSuccess(true);
      // In development, store the reset URL for easy testing
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
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
              <Mail className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-white">Check Your Email</h3>
            <p className="text-zinc-400">
              If an account exists with that email, we&apos;ve sent instructions to reset your password.
            </p>
            {resetUrl && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-400 mb-2">Development mode - Reset link:</p>
                <Link
                  href={resetUrl}
                  className="text-xs text-blue-400 hover:underline break-all"
                >
                  {resetUrl}
                </Link>
              </div>
            )}
            <Link href="/login">
              <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl text-white">Forgot Password</CardTitle>
        <CardDescription className="text-zinc-400">
          Enter your email to receive a password reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={userType} onValueChange={(v) => {
          setUserType(v as 'team' | 'client');
          setError('');
        }} className="mb-6">
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
              placeholder={userType === 'team' ? 'your.email@pivotalconversations.ai' : 'your@email.com'}
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
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <p className="text-sm text-zinc-500 text-center">
            Remember your password?{' '}
            <Link href="/login" className="text-white hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
