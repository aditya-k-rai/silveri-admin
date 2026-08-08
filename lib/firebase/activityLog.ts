import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client';

export interface ActivityEvent {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto: string;
  type: 'cart' | 'wishlist';
  action: 'added' | 'removed';
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  timestamp: Date;
}

export async function logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<void> {
  if (!db) return;
  try {
    await addDoc(collection(db, 'userActivity'), {
      ...event,
      timestamp: Timestamp.now(),
    });
  } catch {
    // non-critical — silently ignore
  }
}

export function subscribeToActivity(
  callback: (events: ActivityEvent[]) => void,
  count = 150
): () => void {
  if (!db) {
    callback([]);
    return () => {};
  }
  const q = query(
    collection(db, 'userActivity'),
    orderBy('timestamp', 'desc'),
    limit(count)
  );
  return onSnapshot(q, (snap) => {
    const events: ActivityEvent[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ActivityEvent, 'id' | 'timestamp'>),
      timestamp: (d.data().timestamp as Timestamp)?.toDate?.() ?? new Date(),
    }));
    callback(events);
  });
}
