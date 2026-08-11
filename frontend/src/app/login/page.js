'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, setToken } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@evmotorcycles.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xs tracking-[0.3em] text-volt uppercase mb-1">Electric Vehicles</div>
          <h1 className="text-2xl font-semibold">Fleet Dashboard</h1>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="text-xs text-neutral-400">Email</label>
            <input
              className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 outline-none focus:border-volt"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400">Password</label>
            <input
              className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 outline-none focus:border-volt"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-volt text-black font-medium rounded-lg py-2 hover:opacity-90 transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-neutral-500 text-center">
            Demo credentials are pre-filled. Run <code>npm run seed</code> on the backend first.
          </p>
          <p className="text-sm text-center text-neutral-400">
            New owner?{' '}
            <Link href="/register" className="text-volt hover:text-white">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
