import { ref, uploadBytes, getDownloadURL, deleteObject, getStorage } from 'firebase/storage';
import app from './client';

// Remove spaces, special chars from filenames to avoid CORS issues
export function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getStorageInstance() {
  if (!app) throw new Error('Firebase not initialized');
  return getStorage(app);
}

export async function uploadProductImage(productId: string, file: File, index: number): Promise<string> {
  const s = getStorageInstance();
  const safeName = sanitize(file.name);
  const storageRef = ref(s, `products/${productId}/${index}-${safeName}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const s = getStorageInstance();
  const storageRef = ref(s, `users/${userId}/avatar`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadCategoryImage(categoryId: string, file: File): Promise<string> {
  const s = getStorageInstance();
  const storageRef = ref(s, `categories/${categoryId}/${sanitize(file.name)}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function uploadBannerImage(file: File, index: number): Promise<string> {
  const s = getStorageInstance();
  const storageRef = ref(s, `banners/${index}-${sanitize(file.name)}`);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

export async function deleteStoragePath(path: string): Promise<void> {
  if (!app) return;
  try {
    const s = getStorage(app);
    await deleteObject(ref(s, path));
  } catch {
    // File may not exist
  }
}
