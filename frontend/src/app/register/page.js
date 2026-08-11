'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { token } = await api.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password
      });
      setToken(token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs tracking-[0.3em] text-volt uppercase mb-1">Electric Vehicles</div>
          <h1 className="text-2xl font-semibold">Create owner account</h1>
          <p className="text-sm text-neutral-500 mt-2">Monitor and manage your electric motorcycles.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-xs text-neutral-400" htmlFor="full-name">Full name</label>
            <input
              id="full-name"
              className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 outline-none focus:border-volt"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400" htmlFor="register-email">Email</label>
            <input
              id="register-email"
              className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 outline-none focus:border-volt"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 outline-none focus:border-volt"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 outline-none focus:border-volt"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-volt text-black font-medium rounded-lg py-2 hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
          <p className="text-sm text-center text-neutral-400">
            Already registered?{' '}
            <Link href="/login" className="text-volt hover:text-white">Sign in</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
