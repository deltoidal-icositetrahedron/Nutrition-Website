import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: true } }; 
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  console.log("BODY:", JSON.stringify(req.body));

  const { action, username, identifier, authMethod, password, heightIn, weightLbs, userId, entry, index } = req.body;

  // ── REGISTER ──────────────────────────────────────────────
  if (action === "register") {
    const regUsername = username; // username field = the actual username, identifier = email/phone
    if (!regUsername || !password) { // was !!regUsername (double-bang bug)
      return res.status(400).json({ error: "Username and password required." });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", regUsername.toLowerCase().trim())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "Username already taken." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        username: regUsername.toLowerCase().trim(),
        password: hashed,
        email: authMethod === "email" ? identifier.toLowerCase().trim() : null,
        phone: authMethod === "phone" ? identifier.trim() : null,
        height: heightIn || null,
        weight: weightLbs || null,
        entries: [],
      })
      .select("id, username, email, phone, height, weight, entries")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ user: data });
  }

  // ── LOGIN ─────────────────────────────────────────────────
  if (action === "login") {
    const loginId = (identifier || username || "").trim();
    if (!loginId || !password) {
      return res.status(400).json({ error: "Identifier and password required." });
    }

    const isPhone = loginId.startsWith("+");

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, password, height, weight, entries")
      .or(
        isPhone
          ? `phone.eq.${loginId},username.eq.${loginId.toLowerCase()}`
          : `email.eq.${loginId.toLowerCase()},username.eq.${loginId.toLowerCase()}`
      )
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const { password: _pw, ...safeUser } = user;
    return res.status(200).json({ user: safeUser });
  }

  // ── UPDATE PROFILE ────────────────────────────────────────
  if (action === "updateProfile") {
    if (!userId) return res.status(400).json({ error: "userId required." });

    const { data, error } = await supabase
      .from("users")
      .update({ height: heightIn || null, weight: weightLbs || null })
      .eq("id", userId)
      .select("id, username, height, weight, entries")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, user: data });
  }

  // ── ADD ENTRY ─────────────────────────────────────────────
  if (action === "addEntry") {
    if (!userId || !entry) return res.status(400).json({ error: "userId and entry required." });

    const { data: current, error: fetchErr } = await supabase
      .from("users")
      .select("entries")
      .eq("id", userId)
      .single();

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    const updated = [...(current.entries || []), entry];

    const { data, error } = await supabase
      .from("users")
      .update({ entries: updated })
      .eq("id", userId)
      .select("id, username, height, weight, entries")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, user: data });
  }

  // ── REMOVE ENTRY ──────────────────────────────────────────
  if (action === "removeEntry") {
    if (userId == null || index == null) return res.status(400).json({ error: "userId and index required." });

    const { data: current, error: fetchErr } = await supabase
      .from("users")
      .select("entries")
      .eq("id", userId)
      .single();

    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    const updated = (current.entries || []).filter((_, i) => i !== index);

    const { data, error } = await supabase
      .from("users")
      .update({ entries: updated })
      .eq("id", userId)
      .select("id, username, height, weight, entries")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, user: data });
  }

  return res.status(400).json({ error: "Unknown action." });
}