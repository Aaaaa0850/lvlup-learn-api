import { Redis } from '@upstash/redis'
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDB } from "./db";
import * as schema from "../../drizzle/schema";
//import { anonymous } from "better-auth/plugins";
import { lastLoginMethod } from "better-auth/plugins";
import { stripe } from "@better-auth/stripe"
import Stripe from "stripe"

// 開発環境用のモック設定（CLI用）
/*const mockDb = {} as any;
const stripeClient = new Stripe("0E8FDf9Gg8b50Tq8xQOUMWjs185e39n6", {
  apiVersion: "2025-12-15.clover",
  httpClient: Stripe.createFetchHttpClient(),
});
export const auth = betterAuth({
  database: drizzleAdapter(mockDb, {
    provider: "sqlite",
    schema: schema,
  }),
  plugins: [
    anonymous(),
    stripe({
      stripeClient,
      stripeWebhookSecret: "0E8FDf9Gg8b50Tq8xQOUMWjs185e39n6",
      createCustomerOnSignUp: true,
    }),
  ],
  socialProviders: {

  },
  secret: "0E8FDf9Gg8b50Tq8xQOUMWjs185e39n6",
  baseURL: "http://localhost:3000",
});*/

// 実際のアプリケーション用の関数
export const getAuth = (env: {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
}) => {
  const stripeClient = new Stripe(env.STRIPE_API_KEY, {
    apiVersion: "2025-12-15.clover",
    httpClient: Stripe.createFetchHttpClient(),
  });
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN
  });
  const db = getDB(env);
  return betterAuth({
    secondaryStorage: {
      get: async (key) => {
        return await redis.get(key);
      },
      set: async (key, value, ttl) => {
        if (ttl) await redis.set(key, value, { ex: ttl });
        else await redis.set(key, value);
      },
      delete: async (key) => {
        await redis.del(key);
      }
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: "secondary-storage",
      customRules: {
        "/api/study-schedules": {
          window: 60,
          max: 5,
        },
        "/api/schedules": {
          window: 60,
          max: 20,
        },
      },
    },
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema,
    }),
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      cookieCache: {
        enabled: true,
        maxAge: 7 * 24 * 60 * 60,
        strategy: "jwe"
      },
      storeSessionInDatabase: false,
    },
    account: {
      storeAccountCookie: true,
    },
    plugins: [
      //anonymous(),
      stripe({
        stripeClient,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        subscriptionTable: schema.subscription,
      }),
      lastLoginMethod(),
    ],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET
      },
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET
      }
    },
    trustedOrigins: ["http://localhost:3000"],
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
  });
};

export type Auth = ReturnType<typeof getAuth>;
export type Session = Auth["$Infer"]["Session"];