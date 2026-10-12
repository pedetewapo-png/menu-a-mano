import { z } from 'zod';
import { MAX_PROFILES, MAX_USER_RECIPES } from '../domain/types';
import { migrateBackupDataV1, migrateBackupDataV2, migrateBackupDataV3 } from './migrations';
import {
  customIngredientSchema,
  favoriteSchema,
  profileSchema,
  savedPlanSchema,
  settingsSchema,
  shoppingListSchema,
  userPhotoSchema,
  userRecipeSchema,
  weekPlanSchema,
} from './schemas';

export const BACKUP_APP_ID = 'menu-a-mano';
/**
 * 1 = v1 (comida y cena).
 * 2 = se añaden los desayunos.
 * 3 = las preferencias se reparten entre fichas de comensal y ajustes de la casa.
 * 4 = recetas e ingredientes propios.
 */
export const BACKUP_SCHEMA_VERSION = 4;

const backupDataSchema = z.object({
  settings: settingsSchema,
  profiles: z.array(profileSchema).max(MAX_PROFILES),
  userRecipes: z.array(userRecipeSchema).max(MAX_USER_RECIPES),
  userIngredients: z.array(customIngredientSchema),
  userPhotos: z.array(userPhotoSchema),
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

  // Las copias antiguas se llevan paso a paso al formato actual antes de validarlas.
  let data = (raw as { data?: unknown }).data;
  if (header.data.schemaVersion <= 1) data = migrateBackupDataV1(data);
  if (header.data.schemaVersion <= 2) data = migrateBackupDataV2(data);
  if (header.data.schemaVersion <= 3) data = migrateBackupDataV3(data);

  const body = backupDataSchema.safeParse(data);
  if (!body.success) {
    const issue = body.error.issues[0];
    return { ok: false, reason: 'invalid', detail: issue ? `${issue.path.join('.')}: ${issue.message}` : undefined };
  }
  return { ok: true, data: body.data };
}
