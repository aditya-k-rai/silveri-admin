import {
  collection,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { Order } from '@/types';

const COLLECTION = 'orders';

function getOrdersRef() {
  if (!db) return null;
  return collection(db, COLLECTION);
}

export function subscribeToUserOrders(
  userId: string,
  callback: (orders: Order[]) => void
): Unsubscribe | null {
  const ref = getOrdersRef();
  if (!ref) {
    callback([]);
    return null;
  }
  const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() ?? (data.updatedAt ? new Date(data.updatedAt) : undefined),
      } as Order;
    });
    callback(orders);
  }, (error) => {
    console.error('Firestore user orders subscription error:', error);
    callback([]);
  });
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLLECTION, orderId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() ?? (data.updatedAt ? new Date(data.updatedAt) : undefined),
  } as Order;
}

export function subscribeToOrders(
  callback: (orders: Order[]) => void
): Unsubscribe | null {
  const ref = getOrdersRef();
  if (!ref) {
    callback([]);
    return null;
  }
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        id: d.id,
        createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate?.() ?? (data.updatedAt ? new Date(data.updatedAt) : undefined),
      } as Order;
    });
    callback(orders);
  }, (error) => {
    console.error('Firestore orders subscription error:', error);
    callback([]);
  });
}

export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLLECTION, orderId), updates);
}
