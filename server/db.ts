import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not set in the environment variables.");
}

const client = new MongoClient(uri);
export const clientPromise = client.connect();

// Extract database name from URI or use default
const dbName = process.env.MONGODB_DB_NAME || "intelligent-document-processing";
console.log(`[DB] Attempting to connect with URI: ${uri.split('@')[1] || uri}`); // Print after @ to avoid logging credentials if any
console.log(`[DB] Attempting to connect to database: ${dbName}`);
export const db = client.db(dbName);

export async function connectToDatabase() {
  try {
    await clientPromise;
    console.log(`Connected successfully to MongoDB - Database: ${dbName}`);
    console.log(`Collections: users, documents, pages, extractions, chatMessages`);
  } catch (e) {
    console.error("Could not connect to MongoDB", e);
    process.exit(1);
  }
}







