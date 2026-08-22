export interface AdminSessionStorage {
  removeItem(key: string): void;
}

export function clearAdminSession(storage: AdminSessionStorage) {
  storage.removeItem('sola_admin_access_token');
  storage.removeItem('sola_admin_user');
}
