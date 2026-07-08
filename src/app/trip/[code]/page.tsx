"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Check, Plus, Trash2, Users } from "lucide-react";
import { SectionTitle } from "@/components/SectionTitle";
import { EmptyState } from "@/components/EmptyState";
import { inputClass, secondaryButtonClass, rowClass, iconButtonClass } from "@/lib/styles";
import type { Trip } from "@/lib/types";

export default function TripHome() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params.code || "").toUpperCase();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);

  const loadTrip = useCallback(async () => {
    const res = await fetch(`/api/trips/${code}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setTrip(data);
    setLoading(false);
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, no data library in this pass
    void loadTrip();
  }, [loadTrip]);

  async function addPlayer() {
    if (!playerName.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/trips/${code}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName.trim() }),
      });
      const player = await res.json();
      if (!res.ok) {
        setError(player.error || "Couldn't add player.");
        return;
      }
      setTrip((t) => (t ? { ...t, players: [...t.players, player] } : t));
      setPlayerName("");
    } catch {
      setError("Couldn't add player.");
    } finally {
      setBusy(false);
    }
  }

  async function removePlayer(id: string) {
    setError("");
    const previous = trip;
    setTrip((t) => (t ? { ...t, players: t.players.filter((p) => p.id !== id) } : t));
    const res = await fetch(`/api/trips/${code}/players/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Couldn't remove player.");
      setTrip(previous ?? null);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/trip/${code}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-ink">
        <p>Loading…</p>
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream p-5 text-center text-ink">
        <p className="font-[family-name:var(--font-display)] text-xl text-green">TRIP NOT FOUND</p>
        <p className="text-sm text-muted">No trip exists with the code {code}.</p>
        <button className={secondaryButtonClass} onClick={() => router.push("/")}>
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="bg-green px-5 pb-4 pt-5 text-cream">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="m-0 font-[family-name:var(--font-display)] text-2xl">{trip.name.toUpperCase()}</h1>
            {(trip.startDate || trip.endDate) && (
              <p className="m-0 mt-1 text-[13px] opacity-85">
                {trip.startDate} {trip.endDate ? `→ ${trip.endDate}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={copyLink}
            className="flex cursor-pointer items-center gap-1.5 rounded bg-rust px-2.5 py-2 font-[family-name:var(--font-mono)] text-[13px] text-white"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />} {trip.code}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[480px] p-4">
        {error && <p className="mb-3 text-sm text-rust">{error}</p>}

        <SectionTitle icon={<Users size={18} />} text="PLAYERS" />
        <div className="mb-3.5 flex gap-2">
          <input
            className={`${inputClass} mb-0`}
            placeholder="Add a player"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
          />
          <button className={secondaryButtonClass} onClick={addPlayer} disabled={busy}>
            <Plus size={16} />
          </button>
        </div>

        {trip.players.length === 0 ? (
          <EmptyState text="No players yet. Add your foursome above." />
        ) : (
          <div className="flex flex-col gap-2">
            {trip.players.map((p) => (
              <div key={p.id} className={rowClass}>
                <span>{p.name}</span>
                <button onClick={() => removePlayer(p.id)} className={iconButtonClass}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="mt-6 cursor-pointer border-none bg-transparent p-0 font-[family-name:var(--font-body)] text-[13px] text-muted underline"
        >
          Leave this trip
        </button>
      </div>
    </div>
  );
}
