'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getToken } from '../../lib/api';
import NotificationFeed from '../../components/NotificationFeed';
import AppSidebar from '../../components/AppSidebar';

export default function DashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [initialAlerts, setInitialAlerts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const [me, v, a] = await Promise.all([api.getMe(), api.getVehicles(), api.getAlerts()]);
        setUser(me);
        setVehicles(v);
        setInitialAlerts(a.filter((x) => !x.is_read));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar user={user} />
      <main className="dashboard-main w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">
        <header className="flex items-center justify-between mb-8">
          <div>
          <div className="text-xs tracking-[0.3em] text-volt uppercase mb-1">Electric Vehicles</div>
          <h1 className="text-xl font-semibold">
            {user?.role === 'owner' ? 'Owner Dashboard' : user?.role === 'engineer' ? 'Engineering Console' : 'Fleet Dashboard'}
          </h1>
          {user && <p className="text-xs text-neutral-500 mt-1">Signed in as {user.full_name} · {user.role.replace('_', ' ')}</p>}
          </div>
          <NotificationFeed initialAlerts={initialAlerts} />
        </header>

        {loading && <p className="text-neutral-500">Loading fleet…</p>}

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-8">
          <SummaryCard label="Total vehicles" value={vehicles.length} />
          <SummaryCard label="Online" value={vehicles.filter((vehicle) => vehicle.status === 'online').length} tone="text-volt" />
          <SummaryCard label="Charging" value={vehicles.filter((vehicle) => vehicle.status === 'charging').length} tone="text-blue-300" />
          <SummaryCard label="Service" value={vehicles.filter((vehicle) => vehicle.status === 'service').length} tone="text-amber-300" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-400">Fleet overview</p>
                <h2 className="text-lg font-semibold mt-1">Your vehicles at a glance</h2>
              </div>
              <Link href="/vehicles" className="text-sm text-volt hover:text-white">View fleet</Link>
            </div>
            {vehicles.slice(0, 4).map((vehicle) => (
              <Link key={vehicle.id} href={`/vehicle/${vehicle.id}`} className="flex items-center justify-between py-3 border-t border-line hover:text-volt">
                <span>{vehicle.nickname || vehicle.model}</span>
                <span className="text-xs text-neutral-500">{vehicle.status}</span>
              </Link>
            ))}
            {!loading && vehicles.length === 0 && <p className="text-sm text-neutral-500">No vehicles assigned yet.</p>}
          </div>
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-400">Quick access</p>
            <div className="grid gap-2 mt-4">
              <QuickLink href="/vehicles" label="Manage vehicles" detail="Inspect telemetry and vehicle records" />
              <QuickLink href="/alerts" label="Review alerts" detail="See warnings and critical events" />
              {user && ['admin', 'fleet_admin'].includes(user.role) && <QuickLink href="/assign-vehicle" label="Assign a vehicle" detail="Register a bike for an owner" />}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, tone = 'text-white' }) {
  return <div className="card p-4"><p className="text-xs text-neutral-500 uppercase tracking-wide">{label}</p><p className={`text-2xl font-semibold mt-2 ${tone}`}>{value}</p></div>;
}

function QuickLink({ href, label, detail }) {
  return <Link href={href} className="block border border-line rounded-lg p-3 hover:border-volt/60"><p className="text-sm">{label}</p><p className="text-xs text-neutral-500 mt-1">{detail}</p></Link>;
}
