import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { getAuth, type Session } from './lib/auth';
import schedules from './schedules/schedules'
import achievements from './achievements/achievements';
import stats from './stats/stats'
import aiGenerateTags from './aiGenerateTags/aiGenerateTags';
import studySchedules from './studySchedules/studySchedules'

type Bindings = {
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
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowedOrigins = [c.env.FRONTEND_URL, "http://localhost:3000"].filter(Boolean);
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
    },
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use(csrf());

// 3. Auth Handler
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return getAuth(c.env).handler(c.req.raw);
});

app.use("/api/*", async (c, next) => {
  const publicPaths = ["/api/auth", "/api/auth/stripe/webhook"];
  if (publicPaths.some(path => c.req.path.startsWith(path)) || c.req.method === "OPTIONS") {
    return await next();
  }

  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);

  await next();
});

// 5. Routes
app.route('/api/schedules', schedules);
app.route('/api/achievements', achievements);
app.route('/api/stats', stats);
app.route('/api/ai-generate-tags', aiGenerateTags);
app.route('/api/study-schedules', studySchedules);

export default app;