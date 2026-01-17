import { z } from "zod";

/*export const ScheduleSchema = z.object({
  title: z.string().max(30, 'タイトルは30文字以内です'),
  subtitle: z.string().max(30, 'サブタイトルは30文字以内です').optional(),
  duration: z.number().min(1, '一分以上で入力してください').max(1440, '24時間以内で入力してください').optional(),
  color: z.string(),
  date: z.string(),
});*/
export const ScheduleId = z.string().length(21, '不正なIDです');
export type ScheduleId = z.infer<typeof ScheduleId>

export const ScheduleTitle = z.string()
  .min(1, 'タイトルを入力してください')
  .max(30, 'タイトルは30文字以内である必要があります');
export type ScheduleTitle = z.infer<typeof ScheduleTitle>;

export const ScheduleSubtitle = z.string()
  .max(30, 'サブタイトルは30文字以内である必要があります')
  .optional();
export type ScheduleSubtitle = z.infer<typeof ScheduleSubtitle>;

export const ScheduleDuration = z.number()
  .min(0, '0分以上で入力する必要があります')
  .max(1440, '24時間以内で入力する必要があります')
  .optional();
export type ScheduleDuration = z.infer<typeof ScheduleDuration>;

export const color = z.string();
export type color = z.infer<typeof color>;

export const tags = z.array(z.string()).max(3).optional().default([]);
export type tags = z.infer<typeof tags>;