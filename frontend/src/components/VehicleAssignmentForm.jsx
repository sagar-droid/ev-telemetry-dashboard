'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function VehicleAssignmentForm({ onCreated }) {
  const [owners, setOwners] = useState([]);
  const [form, setForm] = useState({ owner_id: '', model: 'EV One', vin: '', nickname: '', battery_capacity_wh: '4000' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getOwners()
      .then((items) => {
        setOwners(items);
        if (items[0]) setForm((current) => ({ ...current, owner_id: String(items[0].id) }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const created = await api.registerVehicle({
        ...form,
        owner_id: Number(form.owner_id),
        battery_capacity_wh: Number(form.battery_capacity_wh)
      });
      setMessage('Vehicle assigned successfully.');
      setForm((current) => ({ ...current, vin: '', nickname: '' }));
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 mb-6 space-y-4">
      <div>
        <p className="text-xs text-neutral-400 uppercase tracking-wide">Assign vehicle to owner</p>
        <p className="text-sm text-neutral-500 mt-1">Only admin and fleet admin users can register vehicles.</p>
      </div>
      {loading ? <p className="text-sm text-neutral-500">Loading owner accounts...</p> : owners.length === 0 ? (
        <p className="text-sm text-amber-300">No owner accounts are available.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-xs text-neutral-400">
              Owner
              <select name="owner_id" value={form.owner_id} onChange={updateField} className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 text-sm text-white" required>
                {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.full_name} · {owner.email}</option>)}
              </select>
            </label>
            <label className="text-xs text-neutral-400">
              Model
              <input name="model" value={form.model} onChange={updateField} className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 text-sm" required />
            </label>
            <label className="text-xs text-neutral-400">
              VIN
              <input name="vin" value={form.vin} onChange={updateField} className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 text-sm uppercase" maxLength={32} required />
            </label>
            <label className="text-xs text-neutral-400">
              Nickname
              <input name="nickname" value={form.nickname} onChange={updateField} className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-neutral-400">
              Battery capacity (Wh)
              <input name="battery_capacity_wh" value={form.battery_capacity_wh} onChange={updateField} type="number" min="1" className="w-full mt-1 bg-black/30 border border-line rounded-lg px-3 py-2 text-sm" required />
            </label>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-volt">{message}</p>}
          <button disabled={saving || owners.length === 0} className="bg-volt text-black font-medium rounded-lg px-4 py-2 text-sm disabled:opacity-50">
            {saving ? 'Assigning...' : 'Assign vehicle'}
          </button>
        </>
      )}
    </form>
  );
}