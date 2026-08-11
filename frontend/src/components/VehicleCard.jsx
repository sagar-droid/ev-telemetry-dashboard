'use client';
import Link from 'next/link';

const STATUS_COLOR = {
  online: 'bg-volt',
  offline: 'bg-neutral-600',
  charging: 'bg-blue-400',
  service: 'bg-amber-400'
};

export default function VehicleCard({ vehicle }) {
  return (
    <Link href={`/vehicle/${vehicle.id}`} className="card p-5 block hover:border-volt transition">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{vehicle.nickname || vehicle.model}</h3>
        <span className="flex items-center gap-1.5 text-xs text-neutral-400">
          <span className={`dot ${STATUS_COLOR[vehicle.status]}`} />
          {vehicle.status}
        </span>
      </div>
      <p className="text-sm text-neutral-500">{vehicle.model}</p>
      <p className="text-xs text-neutral-600 mt-1">{vehicle.vin}</p>
      <p className="text-xs text-neutral-600 mt-3">Firmware {vehicle.firmware_version}</p>
    </Link>
  );
}
