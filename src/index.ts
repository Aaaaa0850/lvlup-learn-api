import { Hono } from 'hono'
import { cors } from 'hono/cors';
import { getAuth, type Session } from './lib/auth';
import schedules from './schedules/schedules'
import studyLogs from './studylogs/studylogs';
import visualization from './visualization/visualization'
import aiGenerateTags from './aiGenerateTags/aiGenerateTags';

type Bindings = {
  lvlup_learn: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  //STRIPE_API_KEY: string;
  //STRIPE_WEBHOOK_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

app.use(
  "*",
  cors({
    origin: "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = getAuth(c.env);
  return auth.handler(c.req.raw);
});

app.use("/api/*", async (c, next) => {
  if (c.get("user") || c.req.method === "OPTIONS") return await next();

  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  const user = 'e082e7fe-76b6-4069-b70c-d30b6fb19143';//c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

app.route('/api/schedules', schedules);
app.route('/api/study-logs', studyLogs);
app.route('/api/visualization', visualization)
app.route('/api/ai-generate-tags', aiGenerateTags);

export default app;