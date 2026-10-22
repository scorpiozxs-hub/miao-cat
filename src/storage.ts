import type { Artwork, Draft, Profile } from './types';
let dbPromise: Promise<IDBDatabase> | undefined;
function db() {
  return dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('miao-playground', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('state'); req.result.createObjectStore('artworks', { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function transaction<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode); const req = action(tx.objectStore(store));
    tx.oncomplete = () => resolve(req.result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
export const readDraft = () => transaction<Draft | undefined>('state', 'readonly', s => s.get('draft'));
export const saveDraft = (strokes: StrokeLike) => transaction('state', 'readwrite', s => s.put({ strokes, updatedAt: Date.now() }, 'draft'));
type StrokeLike = Draft['strokes'];
export const clearDraft = () => transaction('state', 'readwrite', s => s.delete('draft'));
export const getArtworks = async () => (await transaction<Artwork[]>('artworks', 'readonly', s => s.getAll())).sort((a,b) => b.createdAt-a.createdAt);
// Idempotent: the final artwork ID is also the request ID.
export const publishArtwork = (art: Artwork) => transaction('artworks', 'readwrite', s => s.put(art));
export const saveReport = (id: string, reason: string) => transaction('state','readwrite',s=>s.put({ id, reason, createdAt: Date.now() }, `report:${id}`));
export function getProfile(): Profile {
  try { const raw = localStorage.getItem('miao-profile'); if(raw) return JSON.parse(raw); } catch { /* unavailable storage uses session identity */ }
  return { id: crypto.randomUUID(), artistName: '', hasPublished: false, muted: true };
}
export function saveProfile(profile: Profile) { try { localStorage.setItem('miao-profile', JSON.stringify(profile)); } catch { /* IndexedDB still retains artworks */ } }
