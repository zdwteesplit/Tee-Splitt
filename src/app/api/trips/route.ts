import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { genCode } from "@/lib/codes";
import type { Trip } from "@/lib/types";

const UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const startDate = body.startDate || null;
  const endDate = body.endDate || null;

  if (!name) {
    return NextResponse.json({ error: "Trip name is required." }, { status: 400 });
  }

  const supabase = getSupabase();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = genCode();
    const { data, error } = await supabase
      .from("trips")
      .insert({ code, name, start_date: startDate, end_date: endDate })
      .select()
      .single();

    if (!error) {
      const trip: Trip = {
        code: data.code,
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        players: [],
      };
      return NextResponse.json(trip, { status: 201 });
    }

    if (error.code !== UNIQUE_VIOLATION) {
      return NextResponse.json({ error: "Could not create trip." }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique trip code. Try again." },
    { status: 500 }
  );
}
