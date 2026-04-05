import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { action, username, password, height, weight } = req.body;

  // ── REGISTER ──────────────────────────────────────────────
  if (action === "register") {
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required." });
    }

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(409).json({ error: "Username already taken." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert({
        username: username.toLowerCase().trim(),
        password: hashed,
        height: height || null,
        weight: weight || null,
        entries: [],
      })
      .select("id, username, height, weight, entries")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, user: data });
  }

  // ── LOGIN ─────────────────────────────────────────────────
  if (action === "login") {
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required." });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, password, height, weight, entries")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const { password: _pw, ...safeUser } = user;
    return res.status(200).json({ ok: true, user: safeUser });
  }

  // ── UPDATE PROFILE ────────────────────────────────────────
  if (action === "updateProfile") {
    const { userId, height: h, weight: w } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required." });

    const { data, error } = await supabase
      .from("users")
      .update({ height: h || null, weight: w || null })
      .eq("id", userId)
      .select("id, username, height, weight, entries")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, user: data });
  }

  // ── ADD ENTRY ─────────────────────────────────────────────
  if (action === "addEntry") {
    const { userId, entry } = req.body;
    if (!userId || !entry) return res.status(400).json({ error: "userId and entry required." });

    // Fetch current entries first
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
    const { userId, index } = req.body;
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