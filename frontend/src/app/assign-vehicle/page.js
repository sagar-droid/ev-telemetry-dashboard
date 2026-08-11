'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import AppSidebar from '../../components/AppSidebar';
import VehicleAssignmentForm from '../../components/VehicleAssignmentForm';

export default function AssignVehiclePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api.getMe()
      .then((currentUser) => {
        if (!['admin', 'fleet_admin'].includes(currentUser.role)) {
          router.replace('/vehicles');
          return;
        }
        setUser(currentUser);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) return <div className="min-h-screen"><AppSidebar user={user} /><main className="dashboard-main p-8 text-neutral-500">Loading...</main></div>;

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar user={user} />
      <main className="dashboard-main w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-volt">Fleet operations</p>
          <h1 className="text-2xl font-semibold mt-2">Assign vehicle</h1>
          <p className="text-sm text-neutral-500 mt-1">Register a motorcycle and assign it to an owner account.</p>
        </header>
        <VehicleAssignmentForm onCreated={() => router.push('/vehicles')} />
      </main>
    </div>
  );
}