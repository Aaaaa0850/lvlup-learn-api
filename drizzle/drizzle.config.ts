import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

const currentEnv = process.env.ENV ?? "development";
console.log(`Current environment: ${currentEnv}`);
dotenv.config({
  path: currentEnv === "production" ? ".prod.vars" : ".dev.vars",
});

if (!process.env.TURSO_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error("環境変数が設定されていません。");
  process.exit(1);
}

export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} as Config;