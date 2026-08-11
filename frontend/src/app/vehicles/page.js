'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import AppSidebar from '../../components/AppSidebar';
import VehicleCard from '../../components/VehicleCard';

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function refreshVehicles() {
    return api.getVehicles().then(setVehicles);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    Promise.all([api.getMe().then(setUser), refreshVehicles()]).finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar user={user} />
      <main className="dashboard-main w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">
        <header className="mb-8">
          <Link href="/dashboard" className="text-xs uppercase tracking-[0.2em] text-volt hover:text-white">Overview</Link>
          <h1 className="text-2xl font-semibold mt-2">Vehicles</h1>
          <p className="text-sm text-neutral-500 mt-1">Monitor your fleet and open an individual vehicle workspace.</p>
        </header>

        {loading && <p className="text-neutral-500">Loading vehicles...</p>}
        {!loading && vehicles.length === 0 && <p className="text-neutral-500">No vehicles assigned yet.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}
        </div>
      </main>
    </div>
  );
}