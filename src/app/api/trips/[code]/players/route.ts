import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Player name is required." }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (tripError || !trip) {
    return NextResponse.json({ error: "No trip found with that code." }, { status: 404 });
  }

  const { data: player, error } = await supabase
    .from("players")
    .insert({ trip_id: trip.id, name })
    .select("id, name")
    .single();

  if (error || !player) {
    return NextResponse.json({ error: "Could not add player." }, { status: 500 });
  }

  return NextResponse.json(player, { status: 201 });
}
