/*import type { Config } from "drizzle-kit";


export default {
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "d1-http",
  dialect: "sqlite",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
} satisfies Config;*/
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

// ENV に応じて読み込む環境変数ファイルを切替え
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