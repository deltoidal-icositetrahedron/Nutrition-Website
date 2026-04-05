import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query, result } = req.body;
  await client.connect();
  const db = client.db("nutrifax")
  await db.collection("searches").updateOne(
    { query: query.toLowerCase().trim() },
    { $set: { query: query.toLowerCase().trim(), result, updatedAt: new Date() } },
    { upsert: true }
  );
  res.status(200).json({ ok: true });
}