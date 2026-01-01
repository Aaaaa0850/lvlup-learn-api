import { Hono } from "hono";
import { type Session } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  ScheduleId,
  ScheduleTitle,
  ScheduleSubtitle,
  ScheduleDuration,
  color,
  tags,
} from "../types/schedule";
import { schedules } from "../../drizzle/schema";
import { nanoid } from "nanoid/non-secure";
import {
  eq,
  asc,
  and,
  desc,
  sql
} from 'drizzle-orm'
import { getDB } from "../lib/db";

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
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
    tags: tags,
  }),
  (result, c) => {
    if (!result.success) {
      console.log('Zod Validation Error:', result.error);
      return c.json({ error: result.error }, 400);
    }
  }
), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user');
  console.log(user)
  const {
    title,
    subtitle,
    duration,
    color,
    tags,
  } = c.req.valid("json");
  const id = nanoid();
  const date = generateTomorrowDate();
  try {
    await db.insert(schedules).values({
      id,
      title,
      subtitle,
      duration,
      color,
      date,
      tags: JSON.stringify(tags),
      userId: user!.id,
    });
    return c.json({
      id,
      title,
      subtitle,
      duration,
      color,
      tags,
    }, 201);
  } catch (e) {
    console.error(e);
    return c.json({ error: "スケジュールの保存に失敗しました" }, 500);
  }
})

app.get('/', async (c) => {
  const db = getDB(c.env);
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
        tags: schedules.tags,
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

app.put('/', zValidator(
  "json",
  z.object({
    id: ScheduleId,
    title: ScheduleTitle,
    subtitle: ScheduleSubtitle,
    duration: ScheduleDuration,
    color: color,
    tags: tags,
  }), (result, c) => {
    if (!result.success) {
      console.log('Zod Validation Error:', result.error);
      return c.json({ error: result.error }, 400);
    }
  }
), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const {
    id,
    title,
    subtitle,
    duration,
    color,
    tags,
  } = c.req.valid("json");
  try {
    await db.update(schedules)
      .set(
        {
          title,
          subtitle,
          duration,
          color,
          tags: JSON.stringify(tags),
        }
      )
      .where(
        and(
          eq(schedules.id, id),
          eq(schedules.userId, user.id)
        )
      )
    return c.json({
      id,
      title,
      subtitle,
      duration,
      color,
      tags,
    }, 200);
  } catch (err) {
    return c.json({ error: 'スケジュールの更新に失敗しました。' }, 500)
  }
})

app.delete('/', zValidator(
  "json",
  z.object({
    id: ScheduleId,
  }),
  (result, c) => {
    if (!result.success) {
      console.log('Zod Validation Error:', result.error);
      return c.json({ error: result.error }, 400);
    }
  }
), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const { id } = c.req.valid("json");
  try {
    await db.delete(schedules).where(and(eq(schedules.id, id), eq(schedules.userId, user.id)));
    return c.json({ message: 'スケジュールの削除に成功しました' }, 200);
  } catch (err) {
    return c.json({ error: 'スケジュールの削除に失敗しました' }, 500);
  }
});
export default app;