import { z } from 'zod';
import { favoriteSchema, preferencesSchema, savedPlanSchema, shoppingListSchema, weekPlanSchema } from './schemas';

export const BACKUP_APP_ID = 'menu-a-mano';
export const BACKUP_SCHEMA_VERSION = 1;

const backupDataSchema = z.object({
  preferences: preferencesSchema,
  weekPlans: z.array(weekPlanSchema),
  savedPlans: z.array(savedPlanSchema),
  favorites: z.array(favoriteSchema),
  shoppingLists: z.array(shoppingListSchema),
});

export type BackupData = z.infer<typeof backupDataSchema>;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  /** Las exclusiones y alérgenos pueden revelar información de salud. */
  notice: string;
  data: BackupData;
}

export type BackupParseResult =
  | { ok: true; data: BackupData }
  | { ok: false; reason: 'notJson' | 'otherApp' | 'newerVersion' | 'invalid'; detail?: string };

/** Valida una copia de seguridad entera antes de que se escriba nada. */
export function parseBackup(text: string): BackupParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'notJson' };
  }
  const header = z.object({ app: z.string(), schemaVersion: z.number().int().positive() }).safeParse(raw);
  if (!header.success || header.data.app !== BACKUP_APP_ID) return { ok: false, reason: 'otherApp' };
  if (header.data.schemaVersion > BACKUP_SCHEMA_VERSION) return { ok: false, reason: 'newerVersion' };
  // Aquí se encadenarán las migraciones cuando exista un esquema 2.
  const body = z.object({ data: backupDataSchema }).safeParse(raw);
  if (!body.success) {
    const issue = body.error.issues[0];
    return { ok: false, reason: 'invalid', detail: issue ? `${issue.path.join('.')}: ${issue.message}` : undefined };
  }
  return { ok: true, data: body.data.data };
}
