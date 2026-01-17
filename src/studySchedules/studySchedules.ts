import { Hono } from "hono";
import { schedules } from "../../drizzle/schema";
import { getDB } from '../lib/db';
import { type Session } from "../lib/auth";
import { and, eq, asc, sql } from "drizzle-orm";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

function getTodayJST() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + (9 * 60));
  return d.toISOString().split('T')[0];
}

app.get('/', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;

  const date = getTodayJST();

  try {
    const result = await db.select({
      id: schedules.id,
      title: schedules.title,
      subtitle: schedules.subtitle,
      duration: schedules.duration,
      tags: schedules.tags,
    })
      .from(schedules)
      .where(and(
        eq(schedules.userId, user.id),
        eq(schedules.completed, false),
        eq(schedules.date, date)
      ))
      .orderBy(
        sql`${schedules.duration} IS NULL ASC`,
        asc(schedules.duration)
      );

    const formatted = result.map(item => ({
      ...item,
      tags: item.tags ? (JSON.parse(item.tags as string) as string[]) : [],
    }));

    return c.json(formatted);
  } catch (e) {
    console.error(`[Fetch Today Schedules Error]: ${e}`);
    return c.json({ error: '本日のスケジュールの取得に失敗しました' }, 500);
  }
});

export default app;