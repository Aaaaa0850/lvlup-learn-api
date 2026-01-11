import { Hono } from "hono";
import { schedules } from "../../drizzle/schema";
import { getDB } from '../lib/db';
import { type Session } from "../lib/auth";
import { and, eq, desc, asc, sql } from "drizzle-orm";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

function generateDate() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstNow.toISOString().split('T')[0];
}

app.get('/', async (c) => {
  const db = getDB(c.env);
  const user = c.get('user');
  console.log(user)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const date = generateDate();
  try {
    const result =
      await db.select({
        id: schedules.id,
        title: schedules.title,
        subtitle: schedules.subtitle,
        duration: schedules.duration,
        tags: schedules.tags,
      }
      ).from(schedules)
        .where(
          and(
            eq(schedules.userId, user.id)
            , eq(schedules.completed, false),
            eq(schedules.date, date)))
        .orderBy(
          desc(sql`case when ${schedules.duration} is null then 1 else 0 end`),
          asc(schedules.duration)
        );
    console.log(result);
    const formattedResult = result.map(item => ({
      ...item,
      tags: item.tags ? (JSON.parse(item.tags as string) as string[]) : [],
    }));
    return c.json(formattedResult, 200);
  } catch (e) {
    console.error(e)
    return c.json({ error: 'スケジュールの取得に失敗しました' }, 500);
  }
})

export default app;