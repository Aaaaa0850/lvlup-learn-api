import { z } from 'zod';

export const studyLogsTitle = z.string();
export const studyLogsSubtitle = z.string().optional();
export const startDateTime = z.string();
export const endDateTime = z.string();
export const date = z.string();
export const studyHours = z.number().min(0).max(1440);