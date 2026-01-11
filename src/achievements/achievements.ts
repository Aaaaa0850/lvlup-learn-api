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
  studyHours,
  tags,
  date,
} from '../types/achievements';
import { studyAchievements } from '../../drizzle/schema';

type Bindings = {
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
};

type Variables = {
  user: Session["user"] | null;
  session: Session["session"] | null;
};

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

app.post('/', zValidator(
  "json",
  z.object({
    title: studyLogsTitle,
    subtitle: studyLogsSubtitle,
    startDateTime: startDateTime,
    endDateTime: endDateTime,
    date: date,
    tags: tags,
    studyHours: studyHours,
  }),
), async (c) => {
  const db = getDB(c.env);
  const user = c.get('user');
  const {
    title,
    subtitle,
    startDateTime,
    endDateTime,
    date,
    tags,
    studyHours
  } = c.req.valid("json");
  const id = nanoid();
  try {
    await db.insert(studyAchievements).values({
      id,
      title,
      subtitle,
      startDateTime,
      endDateTime,
      date,
      studyHours,
      tags: JSON.stringify(tags),
      userId: user!.id
    });

    return c.json({}, 200);
  } catch (e) {
    console.error(e);
    return c.json({}, 500)
  }
})

export default app;