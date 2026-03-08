import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

interface AgendaGroup {
  id: string;
  name: string;
  tasks: {
    id: string;
    text: string;
    details: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
  }[];
  archived: boolean;
  pinned?: boolean;
}

interface UserData {
  agendaGroups: AgendaGroup[];
  activeAgendaId: string | null;
  preferences: {
    sidebarWidth: number;
    sidebarCollapsed: boolean;
  };
  updatedAt: string;
}

function getUserDocRef(userId: string) {
  return doc(db, 'userData', userId);
}

/**
 * Recursively remove undefined values and convert them from objects/arrays,
 * since Firestore rejects undefined field values.
 * - Object keys with undefined values are omitted.
 * - null is preserved (Firestore accepts null).
 */
function stripUndefined(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = stripUndefined(value);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * Load user data from Firestore.
 */
export async function loadUserData(userId: string): Promise<UserData | null> {
  try {
    const ref = getUserDocRef(userId);
    console.log('[Firestore] Loading data from path:', ref.path);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as UserData;
      console.log('[Firestore] Loaded data | agendas:', data.agendaGroups?.length ?? 0, '| updatedAt:', data.updatedAt);
      return data;
    }
    console.log('[Firestore] No document found for user:', userId);
    return null;
  } catch (error: any) {
    console.error('[Firestore] Failed to load:', error?.code, error?.message, error);
    return null;
  }
}

/**
 * Save user data to Firestore (merge to avoid overwriting other fields).
 */
export async function saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
  try {
    const ref = getUserDocRef(userId);
    const payload = stripUndefined({
      ...data,
      updatedAt: new Date().toISOString(),
    });
    console.log('[Firestore] Writing to path:', ref.path, '| payload keys:', Object.keys(payload));
    await setDoc(ref, payload, { merge: true });
    console.log('[Firestore] Write successful for user:', userId);
  } catch (error: any) {
    console.error('[Firestore] Failed to save:', error?.code, error?.message, error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates of user data.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  userId: string,
  callback: (data: UserData | null) => void
): Unsubscribe {
  return onSnapshot(
    getUserDocRef(userId),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserData);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Firestore subscription error:', error);
      callback(null);
    }
  );
}
