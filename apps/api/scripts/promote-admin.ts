import { connectDatabase, disconnectDatabase } from "../src/lib/db";
import { env } from "../src/config/env";
import { User } from "../src/models/user";

// Usage: pnpm --filter @chatbox/api admin:promote you@example.com
const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error("Usage: admin:promote <email>");
  process.exit(1);
}

await connectDatabase(env.MONGODB_URI);
const result = await User.updateOne({ email }, { $set: { role: "admin" } });
console.log(result.matchedCount ? `${email} is now an admin` : `No user found with ${email}`);
await disconnectDatabase();
