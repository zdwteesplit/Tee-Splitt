import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { Trip } from "@/lib/types";

type Params = { params: Promise<{ code: string }> };

async function loadTrip(code: string) {
  const supabase = getSupabase();
  const { data: trip, error } = await supabase
    .from("trips")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error || !trip) return null;

  const { data: players } = await supabase
    .from("players")
    .select("id, name")
    .eq("trip_id", trip.id)
    .order("created_at", { ascending: true });

  return { trip, players: players ?? [] };
}

export async function GET(_request: Request, { params }: Params) {
  const { code } = await params;
  const result = await loadTrip(code);

  if (!result) {
    return NextResponse.json({ error: "No trip found with that code." }, { status: 404 });
  }

  const { trip, players } = result;
  const response: Trip = {
    code: trip.code,
    name: trip.name,
    startDate: trip.start_date,
    endDate: trip.end_date,
    players,
  };
  return NextResponse.json(response);
}

export async function PATCH(request: Request, { params }: Params) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if ("startDate" in body) updates.start_date = body.startDate || null;
  if ("endDate" in body) updates.end_date = body.endDate || null;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("trips")
    .update(updates)
    .eq("code", code.toUpperCase())
    .select()
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No trip found with that code." }, { status: 404 });
  }

  return NextResponse.json({
    code: data.code,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
  });
}
