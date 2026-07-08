import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Params = { params: Promise<{ code: string; id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { code, id } = await params;
  const supabase = getSupabase();

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (tripError || !trip) {
    return NextResponse.json({ error: "No trip found with that code." }, { status: 404 });
  }

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("id", id)
    .eq("trip_id", trip.id);

  if (error) {
    return NextResponse.json({ error: "Could not remove player." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
