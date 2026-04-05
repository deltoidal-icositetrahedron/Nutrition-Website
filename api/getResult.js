import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI);

export default async function handler(req, res) {
  const { query } = req.query;
  await client.connect();
  const db = client.db("nutrifax")
  const found = await db.collection("searches").findOne({
    query: query.toLowerCase().trim()
  });
  if (found) {
    res.status(200).json({ cached: true, result: found.result });
  } else {
    res.status(200).json({ cached: false });
  }
}