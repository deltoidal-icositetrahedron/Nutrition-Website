import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI, { tls: true });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query, result } = req.body;

  // Use Gemini's canonical name as the key, not the raw query
  const key = (result?.name || query).toLowerCase().trim();

  await client.connect();
  const db = client.db("nutrifax");
  await db.collection("searches").updateOne(
    { key },
    { $set: { key, query: query.toLowerCase().trim(), result, updatedAt: new Date() } },
    { upsert: true }
  );

  res.status(200).json({ ok: true });
}