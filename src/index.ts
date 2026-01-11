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
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowedOrigins = ["http://localhost:3000", process.env.FRONTEND_URL].filter(Boolean);
      return allowedOrigins.includes(origin) ? origin : "http://localhost:3000";
    },
    allowHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    allowMethods: ["POST", "GET", "OPTIONS", "PUT", "DELETE"],
    exposeHeaders: ["Content-Length", "Set-Cookie"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use(
  csrf({
    origin: [
      'http://localhost:3000',
      'https://lvlup-learn.com',
    ],
  })
)

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

app.use("/api/*", async (c, next) => {
  if (c.get("user") || c.req.method === "OPTIONS") return await next();
  if (
    c.req.path === "/api/auth/stripe/webhook" ||
    c.req.method === "OPTIONS"
  ) {
    return await next();
  }
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  const user = c.get('user');
  console.log(user)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
});

app.route('/api/schedules', schedules);
app.route('/api/achievements', achievements);
app.route('/api/stats', stats)
app.route('/api/ai-generate-tags', aiGenerateTags);
app.route('api/study-schedules', studySchedules);

export default app;