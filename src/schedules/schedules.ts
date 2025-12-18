import { Hono } from "hono";
import { type Context, type Next } from 'hono'
import { z } from 'zod';

const app = new Hono<{ Bindings: Env }>()

const scheduleSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  duration: z.number().optional(),
  color: z.string(),
  date: z.string(),
})

app.post('/', async (c: Context, next: Next) => {
  const userId = c.get('user')?.uid;
  const { title, subtitle, duration, color, date } = await c.req.json();
  const schedule = scheduleSchema.parse({ title, subtitle, duration, color, date });
  if (!scheduleSchema.safeParse(schedule).success) {
    return c.json({ error: 'Invalid schedule' }, 400);
  }

})

export default app;