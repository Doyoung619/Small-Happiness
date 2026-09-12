import { MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & { mongoClient?: Promise<MongoClient> };

export function mongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  globalForMongo.mongoClient ??= new MongoClient(uri).connect();
  return globalForMongo.mongoClient;
}

export async function mongoDb() {
  const client = await mongoClient();
  return client.db(process.env.MONGODB_DB || "joywalk");
}

export function joyTextCollection(language: string) {
  return `joyTexts_${language.replace(/[^a-z]/g, "").slice(0, 8) || "en"}`;
}
