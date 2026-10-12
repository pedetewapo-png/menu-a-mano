import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, type BackupData, type BackupFile } from './backupFormat';
import { db } from './db';
import { getMeta, getProfiles, getSettings, saveMeta, saveSettings } from './repos';

export async function exportBackup(): Promise<BackupFile> {
  const exportedAt = new Date().toISOString();
  const file: BackupFile = {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    notice: 'Este archivo contiene las preferencias alimentarias, exclusiones y alérgenos de los comensales. Guárdalo en un lugar seguro.',
    data: {
      settings: await getSettings(),
      profiles: await getProfiles(),
      weekPlans: await db.weekPlans.toArray(),
      savedPlans: await db.savedPlans.toArray(),
      favorites: await db.favorites.toArray(),
      shoppingLists: await db.shoppingLists.toArray(),
    },
  };
  await saveMeta({ ...(await getMeta()), lastExportAt: exportedAt });
  return file;
}

/** Sustituye todos los datos por los de la copia (ya validada). */
export async function importBackup(data: BackupData): Promise<void> {
  await db.transaction('rw', [db.kv, db.profiles, db.weekPlans, db.savedPlans, db.favorites, db.shoppingLists], async () => {
    await Promise.all([
      db.profiles.clear(),
      db.weekPlans.clear(),
      db.savedPlans.clear(),
      db.favorites.clear(),
      db.shoppingLists.clear(),
    ]);
    await saveSettings(data.settings);
    await db.profiles.bulkPut(data.profiles);
    await db.weekPlans.bulkPut(data.weekPlans);
    await db.savedPlans.bulkPut(data.savedPlans);
    await db.favorites.bulkPut(data.favorites);
    await db.shoppingLists.bulkPut(data.shoppingLists);
  });
}
