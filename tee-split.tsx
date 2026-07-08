import { useState, useEffect, useCallback } from "react";
import { Flag, Plus, Users, Receipt, Calculator, Copy, Check, Trash2, ChevronRight, Trophy, ChevronLeft, Award } from "lucide-react";

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`;

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function genId() {
  return Math.random().toString(36).slice(2, 10);
}
function money(n) {
  return (Math.round(n * 100) / 100).toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function emptyTrip(code, name, startDate, endDate) {
  return { code, name, startDate, endDate, players: [], expenses: [], rounds: [], sidebets: [] };
}

function relScore(total, par) {
  if (!par) return "";
  const diff = total - par;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

function computeBalances(trip) {
  const balances = {};
  trip.players.forEach((p) => (balances[p.id] = 0));
  trip.expenses.forEach((e) => {
    const share = e.amount / e.splitWith.length;
    balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount;
    e.splitWith.forEach((pid) => {
      balances[pid] = (balances[pid] || 0) - share;
    });
  });
  (trip.sidebets || []).forEach((sb) => {
    const pot = sb.entryAmount * sb.participants.length;
    const payout = sb.winners.length ? pot / sb.winners.length : 0;
    sb.participants.forEach((pid) => {
      balances[pid] = (balances[pid] || 0) - sb.entryAmount;
    });
    sb.winners.forEach((pid) => {
      balances[pid] = (balances[pid] || 0) + payout;
    });
  });
  return trip.players.map((p) => ({ id: p.id, name: p.name, balance: balances[p.id] || 0 }));
}

function settleUp(balances) {
  const creditors = balances.filter((b) => b.balance > 0.005).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.balance < -0.005).map((b) => ({ ...b }));
  const txns = [];
  let ci = 0, di = 0;
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => a.balance - b.balance);
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci], d = debtors[di];
    const amt = Math.min(c.balance, -d.balance);
    txns.push({ from: d.name, to: c.name, amount: amt });
    c.balance -= amt;
    d.balance += amt;
    if (c.balance < 0.005) ci++;
    if (d.balance > -0.005) di++;
  }
  return txns;
}

export default function TeeSplit() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // create-trip form
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [joinCode, setJoinCode] = useState("");

  // add-player
  const [playerName, setPlayerName] = useState("");

  // add-expense
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState("");
  const [expSplitWith, setExpSplitWith] = useState([]);

  // rounds / scorecards
  const [openRoundId, setOpenRoundId] = useState(null);
  const [roundName, setRoundName] = useState("");
  const [roundDate, setRoundDate] = useState("");
  const [roundHoles, setRoundHoles] = useState(18);

  // side bets
  const [sbName, setSbName] = useState("");
  const [sbEntry, setSbEntry] = useState("");
  const [sbParticipants, setSbParticipants] = useState([]);
  const [sbWinners, setSbWinners] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const last = await window.storage.get("last-trip-code", false);
        if (last?.value) {
          const t = await window.storage.get(`trip:${last.value}`, true);
          if (t?.value) {
            const parsed = JSON.parse(t.value);
            setTrip({ rounds: [], sidebets: [], ...parsed });
          }
        }
      } catch (e) {
        // no saved trip, that's fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveTrip = useCallback(async (t) => {
    setTrip(t);
    try {
      await window.storage.set(`trip:${t.code}`, JSON.stringify(t), true);
      await window.storage.set("last-trip-code", t.code, false);
    } catch (e) {
      setError("Couldn't save. Try again.");
    }
  }, []);

  async function handleCreate() {
    if (!newName.trim()) { setError("Give your trip a name."); return; }
    const code = genCode();
    const t = emptyTrip(code, newName.trim(), newStart, newEnd);
    setError("");
    await saveTrip(t);
    setTab("home");
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await window.storage.get(`trip:${code}`, true);
      if (res?.value) {
        const t = { rounds: [], sidebets: [], ...JSON.parse(res.value) };
        setError("");
        await saveTrip(t);
        setTab("home");
      } else {
        setError("No trip found with that code.");
      }
    } catch (e) {
      setError("No trip found with that code.");
    }
  }

  function addPlayer() {
    if (!playerName.trim() || !trip) return;
    const p = { id: genId(), name: playerName.trim() };
    const t = { ...trip, players: [...trip.players, p] };
    setPlayerName("");
    saveTrip(t);
  }

  function removePlayer(id) {
    const t = {
      ...trip,
      players: trip.players.filter((p) => p.id !== id),
      expenses: trip.expenses.map((e) => ({ ...e, splitWith: e.splitWith.filter((pid) => pid !== id) })).filter((e) => e.paidBy !== id),
    };
    saveTrip(t);
  }

  function toggleSplitPlayer(id) {
    setExpSplitWith((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function addExpense() {
    const amt = parseFloat(expAmount);
    if (!expDesc.trim() || !amt || amt <= 0 || !expPaidBy || expSplitWith.length === 0) {
      setError("Fill in description, amount, who paid, and who's splitting it.");
      return;
    }
    const e = { id: genId(), description: expDesc.trim(), amount: amt, paidBy: expPaidBy, splitWith: expSplitWith };
    const t = { ...trip, expenses: [...trip.expenses, e] };
    setExpDesc(""); setExpAmount(""); setExpPaidBy(""); setExpSplitWith([]); setError("");
    saveTrip(t);
  }

  function removeExpense(id) {
    saveTrip({ ...trip, expenses: trip.expenses.filter((e) => e.id !== id) });
  }

  function addRound() {
    if (!roundName.trim()) { setError("Give the round a course name."); return; }
    const holes = Number(roundHoles);
    const round = {
      id: genId(),
      name: roundName.trim(),
      date: roundDate,
      numHoles: holes,
      par: Array(holes).fill(4),
      scores: {},
    };
    setRoundName(""); setRoundDate(""); setError("");
    const t = { ...trip, rounds: [...(trip.rounds || []), round] };
    saveTrip(t);
    setOpenRoundId(round.id);
  }

  function removeRound(id) {
    saveTrip({ ...trip, rounds: (trip.rounds || []).filter((r) => r.id !== id) });
    if (openRoundId === id) setOpenRoundId(null);
  }

  function updatePar(roundId, holeIdx, value) {
    const n = value === "" ? 0 : parseInt(value, 10) || 0;
    const t = {
      ...trip,
      rounds: trip.rounds.map((r) => {
        if (r.id !== roundId) return r;
        const par = [...r.par];
        par[holeIdx] = n;
        return { ...r, par };
      }),
    };
    saveTrip(t);
  }

  function updateScore(roundId, playerId, holeIdx, value) {
    const n = value === "" ? null : parseInt(value, 10) || 0;
    const t = {
      ...trip,
      rounds: trip.rounds.map((r) => {
        if (r.id !== roundId) return r;
        const existing = r.scores[playerId] || Array(r.numHoles).fill(null);
        const scores = [...existing];
        scores[holeIdx] = n;
        return { ...r, scores: { ...r.scores, [playerId]: scores } };
      }),
    };
    saveTrip(t);
  }

  function toggleSbParticipant(id) {
    setSbParticipants((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function toggleSbWinner(id) {
    setSbWinners((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }
  function addSideBet(roundId) {
    const amt = parseFloat(sbEntry);
    if (!sbName.trim() || !amt || amt <= 0 || sbParticipants.length === 0 || sbWinners.length === 0) {
      setError("Fill in the bet name, entry amount, participants, and winner(s).");
      return;
    }
    const sb = { id: genId(), roundId, name: sbName.trim(), entryAmount: amt, participants: sbParticipants, winners: sbWinners };
    setSbName(""); setSbEntry(""); setSbParticipants([]); setSbWinners([]); setError("");
    saveTrip({ ...trip, sidebets: [...(trip.sidebets || []), sb] });
  }
  function removeSideBet(id) {
    saveTrip({ ...trip, sidebets: (trip.sidebets || []).filter((s) => s.id !== id) });
  }

  function copyCode() {
    if (!trip) return;
    navigator.clipboard?.writeText(trip.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function leaveTrip() {
    setTrip(null);
    window.storage.delete("last-trip-code", false).catch(() => {});
  }

  const styles = {
    display: { fontFamily: "'Anton', sans-serif", letterSpacing: "0.02em" },
    body: { fontFamily: "'Work Sans', sans-serif" },
    mono: { fontFamily: "'IBM Plex Mono', monospace" },
  };

  if (loading) {
    return (
      <div style={{ ...styles.body, background: "#F0E9D2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{FONT_IMPORT}</style>
        <p style={{ color: "#26312B" }}>Loading…</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ ...styles.body, background: "#F0E9D2", minHeight: "100vh", color: "#26312B" }}>
        <style>{FONT_IMPORT}</style>
        <div style={{ background: "#1B4332", padding: "28px 20px", color: "#F0E9D2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Flag size={28} color="#F0E9D2" />
            <h1 style={{ ...styles.display, fontSize: 32, margin: 0 }}>TEE SPLIT</h1>
          </div>
          <p style={{ ...styles.body, margin: "6px 0 0", opacity: 0.85, fontSize: 14 }}>Split the costs. Track the bets. Play the round.</p>
        </div>

        <div style={{ padding: 20, maxWidth: 480, margin: "0 auto" }}>
          <div style={{ background: "#fff8ea", border: "2px solid #C9A66B", borderRadius: 4, padding: 20, marginBottom: 20 }}>
            <p style={{ ...styles.display, fontSize: 18, margin: "0 0 14px", color: "#1B4332" }}>NEW TRIP</p>
            <label style={labelStyle}>Trip name</label>
            <input style={inputStyle} placeholder="Myrtle Beach Buddies Trip" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Start date</label>
                <input type="date" style={inputStyle} value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End date</label>
                <input type="date" style={inputStyle} value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>
            <button style={primaryBtn} onClick={handleCreate}>START THE ROUND <ChevronRight size={16} /></button>
          </div>

          <div style={{ textAlign: "center", ...styles.body, fontSize: 13, color: "#6b5f45", margin: "18px 0" }}>— or join an existing trip —</div>

          <div style={{ background: "#fff8ea", border: "2px dashed #C9A66B", borderRadius: 4, padding: 20 }}>
            <label style={labelStyle}>Trip code</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, ...styles.mono, textTransform: "uppercase", marginBottom: 0 }} placeholder="ABCDE" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={5} />
              <button style={{ ...secondaryBtn, marginTop: 0 }} onClick={handleJoin}>Join</button>
            </div>
          </div>

          {error && <p style={{ color: "#A6321D", marginTop: 16, fontSize: 14 }}>{error}</p>}
        </div>
      </div>
    );
  }

  const balances = computeBalances(trip);
  const txns = settleUp(balances);
  const playerName2 = (id) => trip.players.find((p) => p.id === id)?.name || "?";

  return (
    <div style={{ ...styles.body, background: "#F0E9D2", minHeight: "100vh", color: "#26312B", paddingBottom: 70 }}>
      <style>{FONT_IMPORT}</style>

      <div style={{ background: "#1B4332", padding: "20px 20px 16px", color: "#F0E9D2" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ ...styles.display, fontSize: 26, margin: 0 }}>{trip.name.toUpperCase()}</h1>
            {(trip.startDate || trip.endDate) && (
              <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>{trip.startDate} {trip.endDate ? `→ ${trip.endDate}` : ""}</p>
            )}
          </div>
          <button onClick={copyCode} style={{ background: "#A6321D", color: "#fff", border: "none", borderRadius: 4, padding: "8px 10px", ...styles.mono, fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {trip.code}
          </button>
        </div>
      </div>

      <div style={{ padding: 16, maxWidth: 480, margin: "0 auto" }}>
        {error && <p style={{ color: "#A6321D", marginBottom: 12, fontSize: 14 }}>{error}</p>}

        {tab === "home" && (
          <div>
            <SectionTitle icon={<Users size={18} />} text="PLAYERS" styles={styles} />
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Add a player" value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPlayer()} />
              <button style={{ ...secondaryBtn, marginTop: 0 }} onClick={addPlayer}><Plus size={16} /></button>
            </div>
            {trip.players.length === 0 ? (
              <EmptyState text="No players yet. Add your foursome above." />
            ) : (
              <div style={cardList}>
                {trip.players.map((p) => (
                  <div key={p.id} style={rowStyle}>
                    <span>{p.name}</span>
                    <button onClick={() => removePlayer(p.id)} style={iconBtn}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={leaveTrip} style={{ ...styles.body, background: "none", border: "none", color: "#6b5f45", fontSize: 13, marginTop: 24, textDecoration: "underline", cursor: "pointer" }}>Leave this trip</button>
          </div>
        )}

        {tab === "expenses" && (
          <div>
            <SectionTitle icon={<Receipt size={18} />} text="EXPENSES" styles={styles} />
            <div style={{ background: "#fff8ea", border: "2px solid #C9A66B", borderRadius: 4, padding: 16, marginBottom: 16 }}>
              <input style={inputStyle} placeholder="What was it? (Green fees, dinner...)" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
              <input style={inputStyle} type="number" placeholder="Amount" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
              <label style={labelStyle}>Paid by</label>
              <select style={inputStyle} value={expPaidBy} onChange={(e) => setExpPaidBy(e.target.value)}>
                <option value="">Select player</option>
                {trip.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label style={labelStyle}>Split between</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {trip.players.map((p) => (
                  <button key={p.id} onClick={() => toggleSplitPlayer(p.id)} style={{
                    padding: "6px 12px", borderRadius: 20, border: "1.5px solid #1B4332", cursor: "pointer",
                    background: expSplitWith.includes(p.id) ? "#1B4332" : "transparent",
                    color: expSplitWith.includes(p.id) ? "#F0E9D2" : "#1B4332", fontSize: 13, ...styles.body,
                  }}>{p.name}</button>
                ))}
              </div>
              <button style={{ ...primaryBtn, marginTop: 0 }} onClick={addExpense}>ADD EXPENSE</button>
            </div>

            {trip.expenses.length === 0 ? (
              <EmptyState text="No expenses logged yet." />
            ) : (
              <div style={cardList}>
                {trip.expenses.map((e) => (
                  <div key={e.id} style={rowStyle}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{e.description}</div>
                      <div style={{ fontSize: 12, color: "#6b5f45" }}>{playerName2(e.paidBy)} paid · split {e.splitWith.length} way{e.splitWith.length > 1 ? "s" : ""}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ ...styles.mono, fontWeight: 600 }}>{money(e.amount)}</span>
                      <button onClick={() => removeExpense(e.id)} style={iconBtn}><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "scores" && !openRoundId && (
          <div>
            <SectionTitle icon={<Trophy size={18} />} text="ROUNDS" styles={styles} />
            <div style={{ background: "#fff8ea", border: "2px solid #C9A66B", borderRadius: 4, padding: 16, marginBottom: 16 }}>
              <input style={inputStyle} placeholder="Course name" value={roundName} onChange={(e) => setRoundName(e.target.value)} />
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date</label>
                  <input type="date" style={inputStyle} value={roundDate} onChange={(e) => setRoundDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Holes</label>
                  <select style={inputStyle} value={roundHoles} onChange={(e) => setRoundHoles(e.target.value)}>
                    <option value={9}>9</option>
                    <option value={18}>18</option>
                  </select>
                </div>
              </div>
              <button style={{ ...primaryBtn, marginTop: 0 }} onClick={addRound}>ADD ROUND</button>
            </div>

            {(!trip.rounds || trip.rounds.length === 0) ? (
              <EmptyState text="No rounds yet. Add one above to start a scorecard." />
            ) : (
              <div style={cardList}>
                {trip.rounds.map((r) => {
                  const totals = trip.players.map((p) => {
                    const s = r.scores[p.id] || [];
                    const total = s.reduce((a, b) => a + (b || 0), 0);
                    return { name: p.name, total };
                  }).filter((t) => t.total > 0).sort((a, b) => a.total - b.total);
                  const leader = totals[0];
                  return (
                    <div key={r.id} style={rowStyle} onClick={() => setOpenRoundId(r.id)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: "#6b5f45" }}>
                          {[r.date, `${r.numHoles} holes`].filter(Boolean).join(" · ")}
                          {leader ? ` — ${leader.name} leads at ${leader.total}` : ""}
                        </div>
                      </div>
                      <ChevronRight size={18} color="#1B4332" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "scores" && openRoundId && (() => {
          const round = trip.rounds.find((r) => r.id === openRoundId);
          if (!round) { setOpenRoundId(null); return null; }
          const holeIdxs = Array.from({ length: round.numHoles }, (_, i) => i);
          const parTotal = round.par.reduce((a, b) => a + (b || 0), 0);
          const leaderboard = trip.players
            .map((p) => {
              const scores = round.scores[p.id] || [];
              const total = scores.reduce((a, b) => a + (b || 0), 0);
              const played = scores.some((s) => s !== null && s !== undefined);
              return { id: p.id, name: p.name, total, played };
            })
            .filter((p) => p.played)
            .sort((a, b) => a.total - b.total);

          return (
            <div>
              <button onClick={() => setOpenRoundId(null)} style={{ background: "none", border: "none", color: "#1B4332", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: 0, marginBottom: 12, fontFamily: "'Work Sans', sans-serif", fontWeight: 600 }}>
                <ChevronLeft size={18} /> All rounds
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h2 style={{ ...styles.display, fontSize: 20, margin: 0, color: "#1B4332" }}>{round.name.toUpperCase()}</h2>
                <button onClick={() => removeRound(round.id)} style={iconBtn}><Trash2 size={16} /></button>
              </div>
              <p style={{ fontSize: 12, color: "#6b5f45", margin: "0 0 14px" }}>{[round.date, `${round.numHoles} holes`].filter(Boolean).join(" · ")}</p>

              <div style={{ overflowX: "auto", border: "2px solid #1B4332", borderRadius: 4, marginBottom: 20 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", ...styles.mono, fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#1B4332", color: "#F0E9D2" }}>
                      <th style={thStyle}>HOLE</th>
                      {holeIdxs.map((i) => <th key={i} style={thStyle}>{i + 1}</th>)}
                      <th style={thStyle}>TOT</th>
                    </tr>
                    <tr style={{ background: "#fff8ea", borderBottom: "2px solid #C9A66B" }}>
                      <td style={tdStyle}>PAR</td>
                      {holeIdxs.map((i) => (
                        <td key={i} style={tdStyle}>
                          <input type="number" value={round.par[i] === 0 ? "" : round.par[i]} onChange={(e) => updatePar(round.id, i, e.target.value)} style={cellInput} />
                        </td>
                      ))}
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{parTotal}</td>
                    </tr>
                  </thead>
                  <tbody>
                    {trip.players.map((p) => {
                      const scores = round.scores[p.id] || Array(round.numHoles).fill(null);
                      const total = scores.reduce((a, b) => a + (b || 0), 0);
                      return (
                        <tr key={p.id} style={{ borderTop: "1px dashed #C9A66B" }}>
                          <td style={{ ...tdStyle, fontFamily: "'Work Sans', sans-serif", fontWeight: 600, textAlign: "left" }}>{p.name}</td>
                          {holeIdxs.map((i) => (
                            <td key={i} style={tdStyle}>
                              <input type="number" value={scores[i] ?? ""} onChange={(e) => updateScore(round.id, p.id, i, e.target.value)} style={cellInput} />
                            </td>
                          ))}
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{total > 0 ? total : "–"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {trip.players.length === 0 && <EmptyState text="Add players in the Trip tab before entering scores." />}

              <p style={{ ...styles.display, fontSize: 16, margin: "0 0 10px", color: "#1B4332" }}>LEADERBOARD</p>
              {leaderboard.length === 0 ? (
                <EmptyState text="No scores entered yet." />
              ) : (
                <div style={cardList}>
                  {leaderboard.map((p, idx) => (
                    <div key={p.id} style={rowStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ ...styles.mono, color: idx === 0 ? "#A6321D" : "#6b5f45", fontWeight: 700, minWidth: 18 }}>{idx + 1}</span>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                      </div>
                      <span style={{ ...styles.mono, fontWeight: 700 }}>{p.total} <span style={{ color: "#6b5f45", fontWeight: 500 }}>({relScore(p.total, parTotal)})</span></span>
                    </div>
                  ))}
                </div>
              )}

              <p style={{ ...styles.display, fontSize: 16, margin: "24px 0 10px", color: "#1B4332" }}>SIDE BETS</p>
              <div style={{ background: "#fff8ea", border: "2px solid #C9A66B", borderRadius: 4, padding: 16, marginBottom: 16 }}>
                <input style={inputStyle} placeholder="Bet name (Skins, Nassau, Greenies...)" value={sbName} onChange={(e) => setSbName(e.target.value)} />
                <input style={inputStyle} type="number" placeholder="Entry amount per player" value={sbEntry} onChange={(e) => setSbEntry(e.target.value)} />
                <label style={labelStyle}>In the pot</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {trip.players.map((p) => (
                    <button key={p.id} onClick={() => toggleSbParticipant(p.id)} style={{
                      padding: "6px 12px", borderRadius: 20, border: "1.5px solid #1B4332", cursor: "pointer",
                      background: sbParticipants.includes(p.id) ? "#1B4332" : "transparent",
                      color: sbParticipants.includes(p.id) ? "#F0E9D2" : "#1B4332", fontSize: 13, ...styles.body,
                    }}>{p.name}</button>
                  ))}
                </div>
                <label style={labelStyle}>Winner(s)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {sbParticipants.length === 0 ? (
                    <span style={{ fontSize: 12, color: "#6b5f45" }}>Pick participants first.</span>
                  ) : trip.players.filter((p) => sbParticipants.includes(p.id)).map((p) => (
                    <button key={p.id} onClick={() => toggleSbWinner(p.id)} style={{
                      padding: "6px 12px", borderRadius: 20, border: "1.5px solid #A6321D", cursor: "pointer",
                      background: sbWinners.includes(p.id) ? "#A6321D" : "transparent",
                      color: sbWinners.includes(p.id) ? "#fff" : "#A6321D", fontSize: 13, ...styles.body,
                    }}>{p.name}</button>
                  ))}
                </div>
                <button style={{ ...primaryBtn, marginTop: 0 }} onClick={() => addSideBet(round.id)}>ADD BET</button>
              </div>

              {(trip.sidebets || []).filter((s) => s.roundId === round.id).length === 0 ? (
                <EmptyState text="No side bets on this round yet." />
              ) : (
                <div style={cardList}>
                  {(trip.sidebets || []).filter((s) => s.roundId === round.id).map((s) => {
                    const pot = s.entryAmount * s.participants.length;
                    const payout = pot / s.winners.length;
                    const winnerNames = s.winners.map((id) => playerName2(id)).join(" & ");
                    return (
                      <div key={s.id} style={rowStyle}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: "#6b5f45" }}>
                            {money(s.entryAmount)} × {s.participants.length} = {money(pot)} pot — {winnerNames} won {money(payout)} each
                          </div>
                        </div>
                        <button onClick={() => removeSideBet(s.id)} style={iconBtn}><Trash2 size={15} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {tab === "recap" && (() => {
          const totalExpenses = trip.expenses.reduce((a, e) => a + e.amount, 0);
          const totalPots = (trip.sidebets || []).reduce((a, s) => a + s.entryAmount * s.participants.length, 0);
          const roundsPlayed = (trip.rounds || []).filter((r) => Object.keys(r.scores || {}).length > 0);
          const overallLeaderboard = trip.players.map((p) => {
            let totalStrokes = 0, roundsCount = 0;
            (trip.rounds || []).forEach((r) => {
              const s = r.scores[p.id];
              if (s && s.some((v) => v !== null && v !== undefined)) {
                totalStrokes += s.reduce((a, b) => a + (b || 0), 0);
                roundsCount++;
              }
            });
            return { name: p.name, totalStrokes, roundsCount };
          }).filter((p) => p.roundsCount > 0).sort((a, b) => a.totalStrokes - b.totalStrokes);

          function copyRecap() {
            const lines = [];
            lines.push(`⛳ ${trip.name.toUpperCase()} — TRIP RECAP`);
            if (trip.startDate) lines.push(`${trip.startDate}${trip.endDate ? ` → ${trip.endDate}` : ""}`);
            lines.push("");
            lines.push(`TOTAL SPENT: ${money(totalExpenses)}`);
            if (totalPots > 0) lines.push(`SIDE BET ACTION: ${money(totalPots)} across ${trip.sidebets.length} bet(s)`);
            lines.push("");
            lines.push("SETTLE UP:");
            if (txns.length === 0) lines.push("Everyone's square.");
            txns.forEach((t) => lines.push(`${t.from} → ${t.to}: ${money(t.amount)}`));
            if (overallLeaderboard.length > 0) {
              lines.push("");
              lines.push("LEADERBOARD (total strokes):");
              overallLeaderboard.forEach((p, i) => lines.push(`${i + 1}. ${p.name} — ${p.totalStrokes} (${p.roundsCount} round${p.roundsCount > 1 ? "s" : ""})`));
            }
            navigator.clipboard?.writeText(lines.join("\n"));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }

          return (
            <div>
              <SectionTitle icon={<Award size={18} />} text="TRIP RECAP" styles={styles} />

              <div style={{ background: "#1B4332", color: "#F0E9D2", borderRadius: 4, padding: 20, marginBottom: 16, textAlign: "center" }}>
                <p style={{ ...styles.display, fontSize: 24, margin: 0 }}>{trip.name.toUpperCase()}</p>
                {(trip.startDate || trip.endDate) && <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.85 }}>{trip.startDate} {trip.endDate ? `→ ${trip.endDate}` : ""}</p>}
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, background: "#fff8ea", border: "2px solid #C9A66B", borderRadius: 4, padding: 14, textAlign: "center" }}>
                  <p style={{ ...styles.mono, fontSize: 20, fontWeight: 700, margin: 0, color: "#1B4332" }}>{money(totalExpenses)}</p>
                  <p style={{ fontSize: 11, color: "#6b5f45", margin: "4px 0 0" }}>TOTAL SPENT</p>
                </div>
                <div style={{ flex: 1, background: "#fff8ea", border: "2px solid #C9A66B", borderRadius: 4, padding: 14, textAlign: "center" }}>
                  <p style={{ ...styles.mono, fontSize: 20, fontWeight: 700, margin: 0, color: "#1B4332" }}>{roundsPlayed.length}</p>
                  <p style={{ fontSize: 11, color: "#6b5f45", margin: "4px 0 0" }}>ROUNDS PLAYED</p>
                </div>
              </div>

              {overallLeaderboard.length > 0 && (
                <>
                  <p style={{ ...styles.display, fontSize: 16, margin: "0 0 10px", color: "#1B4332" }}>TRIP CHAMPION</p>
                  <div style={cardList}>
                    {overallLeaderboard.map((p, idx) => (
                      <div key={p.name} style={rowStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {idx === 0 ? <Trophy size={16} color="#A6321D" /> : <span style={{ ...styles.mono, minWidth: 16, color: "#6b5f45" }}>{idx + 1}</span>}
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                        </div>
                        <span style={{ ...styles.mono, fontWeight: 700 }}>{p.totalStrokes} <span style={{ fontSize: 11, color: "#6b5f45", fontWeight: 500 }}>/ {p.roundsCount}rd</span></span>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 20 }} />
                </>
              )}

              <p style={{ ...styles.display, fontSize: 16, margin: "0 0 10px", color: "#1B4332" }}>FINAL SETTLE UP</p>
              {txns.length === 0 ? (
                <EmptyState text="Everyone's settled up." />
              ) : (
                <div style={cardList}>
                  {txns.map((t, idx) => (
                    <div key={idx} style={{ ...rowStyle, justifyContent: "flex-start", gap: 10 }}>
                      <span style={{ fontWeight: 600 }}>{t.from}</span>
                      <ChevronRight size={16} color="#A6321D" />
                      <span style={{ fontWeight: 600 }}>{t.to}</span>
                      <span style={{ ...styles.mono, marginLeft: "auto", fontWeight: 700, color: "#A6321D" }}>{money(t.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={copyRecap} style={{ ...primaryBtn, marginTop: 20 }}>
                {copied ? <Check size={16} /> : <Copy size={16} />} COPY RECAP TO SHARE
              </button>
            </div>
          );
        })()}

        {tab === "settle" && (
          <div>
            <SectionTitle icon={<Calculator size={18} />} text="SETTLE UP" styles={styles} />
            <div style={{ background: "#fff8ea", border: "2px solid #1B4332", borderRadius: 4, overflow: "hidden", marginBottom: 20 }}>
              <div style={{ background: "#1B4332", color: "#F0E9D2", padding: "10px 14px", ...styles.mono, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                <span>PLAYER</span><span>NET</span>
              </div>
              {balances.map((b, idx) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderTop: idx > 0 ? "1px dashed #C9A66B" : "none" }}>
                  <span>{b.name}</span>
                  <span style={{ ...styles.mono, fontWeight: 600, color: b.balance > 0.005 ? "#2D6A4F" : b.balance < -0.005 ? "#A6321D" : "#6b5f45" }}>
                    {b.balance > 0.005 ? "+" : ""}{money(b.balance)}
                  </span>
                </div>
              ))}
              {balances.length === 0 && <div style={{ padding: 16, fontSize: 14, color: "#6b5f45" }}>Add players and expenses to see balances.</div>}
            </div>

            <p style={{ ...styles.display, fontSize: 16, margin: "0 0 10px", color: "#1B4332" }}>WHO PAYS WHO</p>
            {txns.length === 0 ? (
              <EmptyState text="Everyone's settled up." />
            ) : (
              <div style={cardList}>
                {txns.map((t, idx) => (
                  <div key={idx} style={{ ...rowStyle, justifyContent: "flex-start", gap: 10 }}>
                    <span style={{ fontWeight: 600 }}>{t.from}</span>
                    <ChevronRight size={16} color="#A6321D" />
                    <span style={{ fontWeight: 600 }}>{t.to}</span>
                    <span style={{ ...styles.mono, marginLeft: "auto", fontWeight: 700, color: "#A6321D" }}>{money(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#1B4332", display: "flex", justifyContent: "space-around", padding: "10px 0", boxShadow: "0 -2px 8px rgba(0,0,0,0.2)" }}>
        {[
          { id: "home", icon: <Users size={20} />, label: "Trip" },
          { id: "expenses", icon: <Receipt size={20} />, label: "Costs" },
          { id: "scores", icon: <Trophy size={20} />, label: "Scores" },
          { id: "settle", icon: <Calculator size={20} />, label: "Settle" },
          { id: "recap", icon: <Award size={20} />, label: "Recap" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 2, color: tab === t.id ? "#F0E9D2" : "#8fae9e",
          }}>
            {t.icon}
            <span style={{ ...styles.body, fontSize: 11 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ icon, text, styles }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, color: "#1B4332" }}>
      {icon}
      <h2 style={{ ...styles.display, fontSize: 20, margin: 0 }}>{text}</h2>
    </div>
  );
}
function EmptyState({ text }) {
  return <div style={{ padding: "24px 16px", textAlign: "center", color: "#6b5f45", fontSize: 14, border: "2px dashed #C9A66B", borderRadius: 4 }}>{text}</div>;
}

const labelStyle = { fontSize: 12, color: "#6b5f45", display: "block", marginBottom: 4, fontFamily: "'Work Sans', sans-serif" };
const inputStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #C9A66B", borderRadius: 4, marginBottom: 12, fontSize: 14, background: "#fff", boxSizing: "border-box", fontFamily: "'Work Sans', sans-serif" };
const primaryBtn = { width: "100%", background: "#A6321D", color: "#fff", border: "none", padding: "12px", borderRadius: 4, fontFamily: "'Anton', sans-serif", fontSize: 14, letterSpacing: "0.03em", cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
const secondaryBtn = { background: "#1B4332", color: "#F0E9D2", border: "none", padding: "10px 16px", borderRadius: 4, fontFamily: "'Work Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" };
const cardList = { display: "flex", flexDirection: "column", gap: 8 };
const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff8ea", border: "1.5px solid #C9A66B", borderRadius: 4, padding: "12px 14px" };
const iconBtn = { background: "none", border: "none", color: "#A6321D", cursor: "pointer", padding: 4 };
const thStyle = { padding: "8px 6px", textAlign: "center", minWidth: 34, fontWeight: 600 };
const tdStyle = { padding: "6px", textAlign: "center", minWidth: 34 };
const cellInput = { width: 30, textAlign: "center", border: "1px solid #C9A66B", borderRadius: 3, padding: "4px 2px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 };
