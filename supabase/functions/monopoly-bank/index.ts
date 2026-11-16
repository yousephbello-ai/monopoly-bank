import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  try {
    const body = await req.json();
    const loginId = Deno.env.get("BANK_LOGIN_ID");
    const loginPin = Deno.env.get("BANK_LOGIN_PIN");
    const transactionPin = Deno.env.get("BANK_TRANSACTION_PIN");

    if (!loginId || !loginPin || !transactionPin) {
      return json({ error: "Backend secrets are not configured." }, 500);
    }
    if (body.loginId !== loginId || body.loginPin !== loginPin) {
      return json({ error: "Account ID or PIN is incorrect." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: rows, error: readError } = await supabase
      .from("zeph")
      .select("id, payload")
      .limit(1);

    if (readError) return json({ error: "Could not read account data." }, 500);

    if (body.action === "get") {
      return json({ state: rows?.[0]?.payload ?? null });
    }

    if (body.action !== "save") return json({ error: "Unknown action." }, 400);
    if (body.transactionPin !== transactionPin) {
      return json({ error: "Incorrect transaction PIN. No changes were made." }, 403);
    }
    if (!body.state || typeof body.state !== "object" || !Array.isArray(body.state.players) ||
        !Array.isArray(body.state.transactions) || !Number.isFinite(body.state.bank)) {
      return json({ error: "Invalid account data." }, 400);
    }

    if (rows && rows.length > 0) {
      const { error } = await supabase
        .from("zeph")
        .update({ payload: body.state })
        .eq("id", rows[0].id);
      if (error) return json({ error: "Could not save account data." }, 500);
    } else {
      const { error } = await supabase.from("zeph").insert({ payload: body.state });
      if (error) return json({ error: "Could not create the first account record." }, 500);
    }

    return json({ ok: true });
  } catch (_error) {
    return json({ error: "Invalid request." }, 400);
  }
});
