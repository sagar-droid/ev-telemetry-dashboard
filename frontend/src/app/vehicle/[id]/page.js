'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, getToken } from '../../../lib/api';
import { useLiveTelemetry } from '../../../lib/useLiveTelemetry';
import Gauge from '../../../components/Gauge';
import AppSidebar from '../../../components/AppSidebar';

const LiveVehicleMap = dynamic(() => import('../../../components/LiveVehicleMap'), { ssr: false });

const STATUS_LABEL = { connecting: 'Connecting…', open: 'Live', closed: 'Disconnected' };
const STATUS_COLOR = { connecting: 'bg-amber-400', open: 'bg-volt', closed: 'bg-red-500' };
const VEHICLE_STATUS_COLOR = {
  online: 'text-volt',
  charging: 'text-blue-300',
  service: 'text-amber-300',
  offline: 'text-neutral-400'
};

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentTelemetry, setCurrentTelemetry] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const { telemetry, status, sendCommand } = useLiveTelemetry(id);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    (async () => {
      try {
        const [v, h, current, allAlerts] = await Promise.all([
          api.getVehicle(id),
          api.getVehicleHistory(id, 6),
          api.getVehicleCurrent(id).catch(() => null),
          api.getAlerts()
        ]);
        setVehicle(v);
        setHistory(h.map((row) => ({ ...row, time: new Date(row.recorded_at).toLocaleTimeString() })));
        setCurrentTelemetry(current);
        setAlerts(allAlerts.filter((alert) => String(alert.vehicle_id) === String(id)).slice(0, 5));
      } catch {
        router.replace('/vehicles');
      }
    })();
  }, [id, router]);

  if (!vehicle) return <div className="min-h-screen"><AppSidebar /><main className="dashboard-main p-8 text-neutral-500">Loading…</main></div>;

  const latest = telemetry || currentTelemetry;
  const locationAvailable = latest?.latitude != null && latest?.longitude != null;

  return (
    <div className="min-h-screen lg:flex">
      <AppSidebar />
      <main className="dashboard-main w-full mx-auto px-4 py-6 lg:px-8 lg:py-8">
      <button onClick={() => router.push('/dashboard')} className="text-sm text-neutral-400 mb-4 hover:text-white">
        ← Fleet
      </button>

      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{vehicle.nickname || vehicle.model}</h1>
          <p className="text-sm text-neutral-500">{vehicle.model} · {vehicle.vin}</p>
        </div>
        <div className="flex items-center gap-2">
        <span className={`text-sm capitalize ${VEHICLE_STATUS_COLOR[vehicle.status] || 'text-neutral-400'}`}>
          {vehicle.status}
        </span>
        <span className="flex items-center gap-2 text-sm card px-3 py-1.5">
          <span className={`dot ${STATUS_COLOR[status]} ${status === 'open' ? 'animate-pulse' : ''}`} />
          {STATUS_LABEL[status]}
        </span>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Gauge label="Speed" value={latest?.speed_kmh} unit="km/h" max={100} />
        <Gauge label="Battery" value={latest?.battery_pct} unit="%" max={100} />
        <Gauge label="Motor Temp" value={latest?.motor_temp_c} unit="°C" max={90} warnAbove={75} />
        <Gauge label="Range" value={latest?.range_km} unit="km" max={90} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <InfoCard label="Odometer" value={latest?.odometer_km != null ? `${latest.odometer_km} km` : '—'} />
        <InfoCard label="Battery capacity" value={`${Math.round(vehicle.battery_capacity_wh / 1000 * 10) / 10} kWh`} />
        <InfoCard label="Firmware" value={vehicle.firmware_version || '—'} />
      </div>

      <div className="card overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-xs text-neutral-400 uppercase tracking-wide">Live location</p>
            <p className="text-sm text-neutral-500 mt-1">
              {locationAvailable ? `${latest.latitude}, ${latest.longitude}` : 'Waiting for GPS telemetry'}
            </p>
          </div>
          {status === 'open' && <span className="text-xs text-volt">Updating live</span>}
        </div>
        <LiveVehicleMap telemetry={latest} />
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">Bike commands (over the live WebSocket)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => sendCommand('honk')} className="bg-white/5 hover:bg-white/10 border border-line rounded-lg px-3 py-1.5 text-sm">
            Honk
          </button>
          <button onClick={() => sendCommand('flash_lights')} className="bg-white/5 hover:bg-white/10 border border-line rounded-lg px-3 py-1.5 text-sm">
            Flash lights
          </button>
          <button onClick={() => sendCommand('lock')} className="bg-white/5 hover:bg-white/10 border border-line rounded-lg px-3 py-1.5 text-sm">
            Lock
          </button>
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-neutral-400 uppercase tracking-wide">Recent vehicle alerts</p>
          <span className="text-xs text-neutral-500">{alerts.length} shown</span>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-neutral-500">No alerts recorded for this vehicle.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 border-t border-line pt-3 first:border-0 first:pt-0">
                <span className={`dot mt-1 ${alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <div className="min-w-0">
                  <p className="text-sm">{alert.message}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {alert.type} · {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <TelemetryChart title="Battery — last 6 hours" data={history} dataKey="battery_pct" unit="%" color="#c4ff4d" domain={[0, 100]} />
        <TelemetryChart title="Speed — last 6 hours" data={history} dataKey="speed_kmh" unit="km/h" color="#7dd3fc" />
        <TelemetryChart title="Motor temperature — last 6 hours" data={history} dataKey="motor_temp_c" unit="°C" color="#fb923c" />
        <TelemetryChart title="Estimated range — last 6 hours" data={history} dataKey="range_km" unit="km" color="#d8b4fe" />
      </div>
      </main>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-neutral-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function TelemetryChart({ title, data, dataKey, unit, color, domain }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-neutral-400 uppercase tracking-wide mb-4">{title}</p>
      {data.length === 0 ? (
        <p className="h-[260px] flex items-center justify-center text-sm text-neutral-500">No history available</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid stroke="#1f2a22" vertical={false} />
            <XAxis dataKey="time" stroke="#555" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis stroke="#555" tick={{ fontSize: 11 }} domain={domain || ['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#121814', border: '1px solid #1f2a22' }}
              formatter={(value) => [`${value} ${unit}`, title.split(' — ')[0]]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
