import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';

const COLLECTION = 'categories';

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
  subCategories: SubCategory[];
  /** Whether this category appears in the top nav bar */
  showInNav?: boolean;
  /** Display order in the nav bar (lower = left) */
  navOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

function getCatRef() {
  if (!db) return null;
  return collection(db, COLLECTION);
}

export function subscribeToCategories(
  callback: (categories: Category[]) => void
): Unsubscribe | null {
  const ref = getCatRef();
  if (!ref) {
    callback([]);
    return null;
  }
  const q = query(ref, orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const cats = snap.docs.map((d) => {
        const data = d.data();
      return {
          id: d.id,
          name: data.name || '',
          slug: data.slug || '',
          image: data.image || null,
          productCount: data.productCount || 0,
          subCategories: data.subCategories || [],
          showInNav: data.showInNav ?? false,
          navOrder: data.navOrder ?? 99,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Category;
      });
      callback(cats);
    },
    () => callback([])
  );
}

export async function saveCategory(cat: Category): Promise<void> {
  if (!db) return;
  const ref = doc(db, COLLECTION, cat.id);
  await setDoc(ref, {
    name: cat.name,
    slug: cat.slug,
    image: cat.image,
    productCount: cat.productCount,
    subCategories: cat.subCategories,
    showInNav: cat.showInNav ?? false,
    navOrder: cat.navOrder ?? 99,
    createdAt: cat.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, COLLECTION, id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION, id));
}
