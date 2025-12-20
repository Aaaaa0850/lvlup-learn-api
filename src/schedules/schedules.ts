import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { drizzle } from "drizzle-orm/d1";
import { ScheduleTitle, ScheduleSubtitle, ScheduleDuration, color } from "../types/schedule";
import { schedules } from "../../drizzle/schema";
import type { UserRecord } from 'firebase-auth-cloudflare-workers/dist/main/user-record'
import { nanoid } from "nanoid/non-secure";
import { eq, asc, and, desc, sql } from 'drizzle-orm'

type Bindings = {
  lvlup_learn: D1Database
};

type Variables = {
  user: UserRecord
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
  const db = drizzle(c.env.lvlup_learn);
  const user = c.get('user');
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
      userId: user.uid,
    });
    return c.json({ success: true }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "データベースへの保存に失敗しました" }, 500);
  }
})

app.get('/', async (c) => {
  const db = drizzle(c.env.lvlup_learn);
  const user = c.get('user');
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
            eq(schedules.userId, user.uid)
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