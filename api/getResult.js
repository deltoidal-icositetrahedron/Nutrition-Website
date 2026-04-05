import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI, { tls: true });

export default async function handler(req, res) {
  const { query } = req.query;
  const key = query.toLowerCase().trim();

  await client.connect();
  const db = client.db("nutrifax");

  // Match either the canonical name or the original query
  const found = await db.collection("searches").findOne({
    $or: [{ key }, { query: key }]
  });

  if (found) {
    res.status(200).json({ cached: true, result: found.result });
  } else {
    res.status(200).json({ cached: false });
  }
}