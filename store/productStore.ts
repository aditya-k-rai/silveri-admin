import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  makingMargin: number;
  isLinked: boolean;
  stock: number;
  category: string;
  subCategory: string;
  status: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  carat: string;
  colour: string;
  colour2: string;
  /** Plating treatment: "" | "Gold Plated" | "Silver Plated" | "Gold & Silver Plated" */
  plating: string;
  /** Comma-separated list of available ring sizes, e.g. "6, 7, 8, 9, 10". Empty = no size selector. */
  ringSizes: string;
  /** When true, customer product page shows a "With Chain / Without Chain" toggle (typically for pendants). */
  chainOption: boolean;
  /** Additional rupees added to the base price when the customer picks "With Chain". 0 = no extra. */
  chainPrice: number;
  /** Surcharge added when the customer chooses "Gold Plated" over the default "Silver Plated". Defaults to 200 on new products. */
  goldPlatingPrice: number;
  /** Per-product shipping cost in ₹. 0 = free shipping for this item.
   *  Checkout charges the max shipping cost across all items in the cart.
   *  Admin sets this per product. If undefined, checkout falls back to ₹99. */
  shippingCost?: number;
  size: string;
  height: string;
  weight: string;
  width: string;
  radius: string;
  description: string;
  warranty: string;
  tags: string;
  views: number;
  primaryImage: string | null;
  hoverImage: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  image6: string | null;
}

interface ProductStore {
  products: Product[];
  loading: boolean;
  setProducts: (products: Product[]) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  incrementViews: (id: string) => void;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  loading: true,
  setProducts: (items) => set({ products: items, loading: false }),
  updateProduct: (id, updates) => set((state) => ({
    products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
  })),
  addProduct: (product) => set((state) => ({
    products: [product, ...state.products]
  })),
  incrementViews: (id) => set((state) => ({
    products: state.products.map(p => p.id === id ? { ...p, views: (p.views ?? 0) + 1 } : p)
  })),
}));
