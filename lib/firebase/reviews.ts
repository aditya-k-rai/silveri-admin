import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { db } from './client';
import { Review, AdminReply } from '@/types';

const COLLECTION = 'reviews';

function ref() {
  if (!db) return null;
  return collection(db, COLLECTION);
}

/** Map raw Firestore doc data → typed Review (handles Firestore Timestamp → Date) */
function fromFirestore(id: string, data: DocumentData): Review {
  const reply = data.adminReply
    ? ({
        text: data.adminReply.text ?? '',
        adminName: data.adminReply.adminName ?? 'Silveri',
        repliedAt:
          data.adminReply.repliedAt?.toDate?.() ??
          (data.adminReply.repliedAt ? new Date(data.adminReply.repliedAt) : new Date()),
      } as AdminReply)
    : undefined;
  return {
    id,
    productId: data.productId,
    userId: data.userId,
    userName: data.userName ?? 'Anonymous',
    userPhoto: data.userPhoto,
    rating: data.rating ?? 0,
    comment: data.comment ?? '',
    title: data.title,
    orderId: data.orderId,
    adminReply: reply,
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt ?? Date.now()),
    updatedAt: data.updatedAt?.toDate?.() ?? (data.updatedAt ? new Date(data.updatedAt) : undefined),
  };
}

/** Live feed of all reviews for a single product (used on the product detail page). */
export function subscribeToProductReviews(
  productId: string,
  callback: (reviews: Review[]) => void
): Unsubscribe | null {
  const r = ref();
  if (!r) {
    callback([]);
    return null;
  }
  const q = query(r, where('productId', '==', productId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => fromFirestore(d.id, d.data()))),
    (err) => {
      console.error('[reviews] product subscription error:', err);
      callback([]);
    }
  );
}

/** Live feed of every review the given user has written (account/reviews page). */
export function subscribeToUserReviews(
  userId: string,
  callback: (reviews: Review[]) => void
): Unsubscribe | null {
  const r = ref();
  if (!r) {
    callback([]);
    return null;
  }
  const q = query(r, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => fromFirestore(d.id, d.data()))),
    (err) => {
      console.error('[reviews] user subscription error:', err);
      callback([]);
    }
  );
}

/** Live feed of every review across the whole store — admin dashboard. */
export function subscribeToAllReviews(
  callback: (reviews: Review[]) => void
): Unsubscribe | null {
  const r = ref();
  if (!r) {
    callback([]);
    return null;
  }
  const q = query(r, orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => fromFirestore(d.id, d.data()))),
    (err) => {
      console.error('[reviews] all-reviews subscription error:', err);
      callback([]);
    }
  );
}

/** Create a new review. Called from the customer side when leaving feedback on a delivered order. */
export async function createReview(input: {
  productId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  title?: string;
  orderId?: string;
}): Promise<string | null> {
  const r = ref();
  if (!r) return null;
  const docRef = await addDoc(r, {
    ...input,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

/** Edit an existing review (only the author can call). */
export async function updateReview(
  reviewId: string,
  updates: Partial<Pick<Review, 'rating' | 'comment' | 'title'>>
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLLECTION, reviewId), {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

/** Delete a review (author or admin). */
export async function deleteReview(reviewId: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION, reviewId));
}

/** Admin replies to a review (or updates existing reply). */
export async function setAdminReply(
  reviewId: string,
  reply: { text: string; adminName: string }
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLLECTION, reviewId), {
    adminReply: {
      ...reply,
      repliedAt: Timestamp.now(),
    },
  });
}

/** Remove an admin reply. */
export async function removeAdminReply(reviewId: string): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLLECTION, reviewId), {
    adminReply: null,
  });
}
