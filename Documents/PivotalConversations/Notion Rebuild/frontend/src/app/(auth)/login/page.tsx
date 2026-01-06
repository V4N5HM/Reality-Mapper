import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Pivotal Conversations</h1>
          <p className="text-zinc-400">Personal Brand Workspace</p>
        </div>
        <Suspense fallback={<div className="text-zinc-500 text-center">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
