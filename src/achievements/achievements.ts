import { Hono } from 'hono'
import { type Session } from "../lib/auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDB } from '../lib/db';
import { nanoid } from 'nanoid/non-secure';
import {
  studyLogsTitle,
  studyLogsSubtitle,
  startDateTime,
  endDateTime,
  studyMinutes,
  tags,
  date,
} from '../types/achievements';
import { studyAchievements, schedules } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm'

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

const schema = z.object({
  scheduleId: z.string().length(21).optional(),
  title: studyLogsTitle,
  subtitle: studyLogsSubtitle,
  startDateTime: startDateTime,
  endDateTime: endDateTime,
  date: date,
  tags: tags,
  studyMinutes: studyMinutes,
});

app.post('/', zValidator("json", schema), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user')!;
  const { scheduleId, ...data } = c.req.valid("json");
  const achievementId = nanoid();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(studyAchievements).values({
        id: achievementId,
        ...data,
        tags: JSON.stringify(data.tags),
        userId: user.id
      });

      if (scheduleId) {
        await tx.update(schedules)
          .set({ completed: true })
          .where(and(
            eq(schedules.id, scheduleId),
            eq(schedules.userId, user.id)
          ));
      }
    });

    return c.json({ success: true, id: achievementId }, 201);
  } catch (e) {
    console.error("Failed to save study achievement:", e);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;