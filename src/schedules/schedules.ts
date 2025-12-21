import { Hono } from "hono";
import { type Session } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { ScheduleTitle, ScheduleSubtitle, ScheduleDuration, color } from "../types/schedule";
import { schedules } from "../../drizzle/schema";
import { nanoid } from "nanoid/non-secure";
import { eq, asc, and, desc, sql } from 'drizzle-orm'

type Bindings = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
}

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>()

function generateTomorrowDate() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const jstTomorrow = new Date(jstNow.getTime() + (24 * 60 * 60 * 1000));
  return jstTomorrow.toISOString().split('T')[0];
}

app.post('/', zValidator(
  "json",
  z.object({
    title: ScheduleTitle,
    subtitle: ScheduleSubtitle,
    duration: ScheduleDuration,
    color: color,
  }),
), async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const { title, subtitle, duration, color } = c.req.valid("json");
  const id = nanoid();
  const date = generateTomorrowDate()
  try {
    await db.insert(schedules).values({
      id,
      title,
      subtitle,
      duration,
      color,
      date,
      userId: user.id,
    });
    return c.json({ success: true }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "データベースへの保存に失敗しました" }, 500);
  }
})

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const date = generateTomorrowDate()
  try {
    const result =
      await db.select({
        id: schedules.id,
        title: schedules.title,
        subtitle: schedules.subtitle,
        duration: schedules.duration,
        color: schedules.color,
      }
      ).from(schedules)
        .where(
          and(
            eq(schedules.userId, user.id)
            , eq(schedules.date, date)))
        .orderBy(
          desc(sql`case when ${schedules.duration} is null then 1 else 0 end`),
          asc(schedules.duration)
        );
    return c.json(result, 200);
  } catch (e) {
    return c.json({}, 500);
  }
})

export default app;