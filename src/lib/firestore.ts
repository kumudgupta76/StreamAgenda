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
 * Load user data from Firestore.
 */
export async function loadUserData(userId: string): Promise<UserData | null> {
  try {
    const snap = await getDoc(getUserDocRef(userId));
    if (snap.exists()) {
      return snap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Failed to load user data from Firestore:', error);
    return null;
  }
}

/**
 * Save user data to Firestore (merge to avoid overwriting other fields).
 */
export async function saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
  try {
    await setDoc(getUserDocRef(userId), {
      ...data,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to save user data to Firestore:', error);
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
