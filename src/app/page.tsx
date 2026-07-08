"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, ChevronRight } from "lucide-react";
import { cardClass, dashedCardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/styles";

export default function Landing() {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!newName.trim()) {
      setError("Give your trip a name.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), startDate: newStart || null, endDate: newEnd || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create trip. Try again.");
        return;
      }
      router.push(`/trip/${data.code}`);
    } catch {
      setError("Couldn't create trip. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${code}`);
      if (!res.ok) {
        setError("No trip found with that code.");
        return;
      }
      router.push(`/trip/${code}`);
    } catch {
      setError("No trip found with that code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="bg-green px-5 py-7 text-cream">
        <div className="flex items-center gap-2.5">
          <Flag size={28} color="#F0E9D2" />
          <h1 className="m-0 font-[family-name:var(--font-display)] text-3xl tracking-wide">TEE SPLIT</h1>
        </div>
        <p className="m-0 mt-1.5 font-[family-name:var(--font-body)] text-sm opacity-85">
          Split the costs. Track the bets. Play the round.
        </p>
      </div>

      <div className="mx-auto max-w-[480px] p-5">
        <div className={`${cardClass} mb-5`}>
          <p className="m-0 mb-3.5 font-[family-name:var(--font-display)] text-lg text-green">NEW TRIP</p>
          <label className={labelClass}>Trip name</label>
          <input
            className={inputClass}
            placeholder="Myrtle Beach Buddies Trip"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="flex gap-2.5">
            <div className="flex-1">
              <label className={labelClass}>Start date</label>
              <input type="date" className={inputClass} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>End date</label>
              <input type="date" className={inputClass} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </div>
          </div>
          <button className={primaryButtonClass} onClick={handleCreate} disabled={busy}>
            START THE ROUND <ChevronRight size={16} />
          </button>
        </div>

        <div className="my-[18px] text-center font-[family-name:var(--font-body)] text-[13px] text-muted">
          — or join an existing trip —
        </div>

        <div className={dashedCardClass}>
          <label className={labelClass}>Trip code</label>
          <div className="flex gap-2">
            <input
              className={`${inputClass} mb-0 font-[family-name:var(--font-mono)] uppercase`}
              placeholder="ABCDE"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              maxLength={5}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <button className={secondaryButtonClass} onClick={handleJoin} disabled={busy}>
              Join
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-rust">{error}</p>}
      </div>
    </div>
  );
}
