// src/lib/auth.ts
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../../drizzle/schema";
import { anonymous } from "better-auth/plugins";

// 開発環境用のモック設定（CLI用）
const mockDb = {} as any;

export const auth = betterAuth({
  database: drizzleAdapter(mockDb, {
    provider: "sqlite",
    schema: schema,
  }),
  plugins: [
    anonymous()
  ],
  socialProviders: {

  },
  secret: "cCzitr7YZQG6uQjABUilR6lkle7YkdZl",
  baseURL: "http://localhost:3000",
});

// 実際のアプリケーション用の関数
export const getAuth = (env: { DB: D1Database; BETTER_AUTH_SECRET: string; BETTER_AUTH_URL: string }) => {
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    plugins: [
      anonymous()
    ],
    socialProviders: {

    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  });
};

export type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"];