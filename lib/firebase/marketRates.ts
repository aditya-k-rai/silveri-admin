import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './client';

const COLLECTION = 'marketRates';

export interface MarketRateEntry {
  silverRate: number;
  usdInr: number;
  fetchedAt: Date;
  fredObservationDate?: string;
}

function getRatesRef() {
  if (!db) return null;
  return collection(db, COLLECTION);
}

export async function saveMarketRate(entry: Omit<MarketRateEntry, 'fetchedAt'> & { fetchedAt: Date }): Promise<void> {
  const ref = getRatesRef();
  if (!ref) return;
  await addDoc(ref, {
    silverRate: entry.silverRate,
    usdInr: entry.usdInr,
    fredObservationDate: entry.fredObservationDate || null,
    fetchedAt: Timestamp.fromDate(entry.fetchedAt),
  });
}

export async function fetchRecentRates(count: number = 200): Promise<MarketRateEntry[]> {
  const ref = getRatesRef();
  if (!ref) return [];
  const q = query(ref, orderBy('fetchedAt', 'desc'), limit(count));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        silverRate: data.silverRate,
        usdInr: data.usdInr,
        fetchedAt: data.fetchedAt?.toDate?.() ?? new Date(data.fetchedAt),
        fredObservationDate: data.fredObservationDate || undefined,
      } as MarketRateEntry;
    })
    .reverse(); // oldest first for chart
}
