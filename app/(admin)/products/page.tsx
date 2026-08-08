"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Star, Sparkles, X, Image as ImageIcon, Upload, Save, Tag, Activity, Eye, Minus } from "lucide-react";
import { useProductStore, Product } from "@/store/productStore";
import { saveProduct as saveProductToFirestore } from "@/lib/firebase/products";
import { subscribeToCategories, Category } from "@/lib/firebase/categories";
// Images stored as compressed base64 directly in Firestore (no Firebase Storage needed)
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function AdminProductsPage() {
  const { products, updateProduct, addProduct } = useProductStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Name");
  const [dbCategories, setDbCategories] = useState<Category[]>([]);

  // Editor State
  const [editingParams, setEditingParams] = useState<Product | null>(null);

  // History Modal State
  const [historyViewProduct, setHistoryViewProduct] = useState<Product | null>(null);

  // Load Firestore categories for the product editor dropdown
  useEffect(() => {
    const unsub = subscribeToCategories((cats) => setDbCategories(cats));
    return () => { if (unsub) unsub(); };
  }, []);


  const filtered = products
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "Name") return a.name.localeCompare(b.name);
      if (sortBy === "PriceAsc") return a.price - b.price;
      if (sortBy === "PriceDesc") return b.price - a.price;
      if (sortBy === "StockAsc") return a.stock - b.stock;
      if (sortBy === "StockDesc") return b.stock - a.stock;
      if (sortBy === "Carat") return a.carat.localeCompare(b.carat);
      if (sortBy === "Category") {
        const c = (a.category || "").localeCompare(b.category || "");
        if (c !== 0) return c;
        const s = (a.subCategory || "").localeCompare(b.subCategory || "");
        if (s !== 0) return s;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  const toggleFlag = async (e: React.MouseEvent, id: string, field: 'isFeatured' | 'isNewArrival') => {
    e.stopPropagation();
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    const updates = { [field]: !p[field] };
    updateProduct(id, updates);
    await saveProductToFirestore({ ...p, ...updates });
  };

  const openEditor = (prod: Product | null) => {
    if (prod) {
      setEditingParams({ ...prod });
    } else {
      setEditingParams({
        id: `P${Date.now()}`,
        name: "",
        sku: `SLV-NEW-${Math.floor(1000 + Math.random() * 9000)}`,
        price: 0,
        makingMargin: 500,
        shippingCost: 99,
        isLinked: false,
        stock: 999,
        category: dbCategories[0]?.name ?? "",
        subCategory: "",
        status: "Draft",
        isFeatured: false,
        isNewArrival: false,
        carat: "22K",
        colour: "Silver",
        colour2: "",
        plating: "",
        ringSizes: "",
        chainOption: false,
        chainPrice: 0,
        goldPlatingPrice: 200,
        size: "",
        height: "",
        weight: "",
        width: "",
        radius: "",
        description: "",
        warranty: "",
        tags: "",
        views: 0,
        primaryImage: null,
        hoverImage: null,
        image3: null,
        image4: null,
        image5: null,
        image6: null,
      });
    }
  };

  const closeEditor = () => setEditingParams(null);
  const cancelEditor = () => closeEditor();

  const [isSaving, setIsSaving] = useState(false);

  // Compress image to small base64 for Firestore storage
  const compressToBase64 = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        // Try WebP first, fallback to JPEG
        let result = canvas.toDataURL('image/webp', quality);
        if (!result.startsWith('data:image/webp')) {
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const saveProduct = async () => {
    if (!editingParams) return;
    setIsSaving(true);
    try {
      const isNew = !products.some(p => p.id === editingParams.id);
      if (isNew) {
        addProduct(editingParams);
      } else {
        updateProduct(editingParams.id, editingParams);
      }
      await saveProductToFirestore(editingParams);
      closeEditor();
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to generate a fake realistic 30 day curve based heavily on the actual current price anchor
  const generate30DayData = (currentPrice: number) => {
    const data = [];
    let walkingPrice = currentPrice * 0.90; // Start 10% lower a month ago
    for (let i = 30; i >= 1; i--) {
      // Create an elegant market walk toward current price
      walkingPrice += (currentPrice - walkingPrice) * 0.15 + (Math.random() * (currentPrice * 0.02)) - (currentPrice * 0.01);
      data.push({
        date: `Day -${i}`,
        price: Math.round(walkingPrice)
      });
    }
    data.push({ date: "Today", price: currentPrice });
    return data;
  };

  const IMAGE_FIELD_MAP: Record<string, { field: keyof Product; index: number }> = {
    primary: { field: 'primaryImage', index: 0 },
    hover: { field: 'hoverImage', index: 1 },
    image3: { field: 'image3', index: 2 },
    image4: { field: 'image4', index: 3 },
    image5: { field: 'image5', index: 4 },
    image6: { field: 'image6', index: 5 },
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'primary' | 'hover' | 'image3' | 'image4' | 'image5' | 'image6') => {
    if (!editingParams || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    const { field } = IMAGE_FIELD_MAP[type];

    try {
      // Compress image and store as base64 in Firestore
      const base64 = await compressToBase64(file);
      setEditingParams((prev) => prev ? { ...prev, [field]: base64 } : prev);
    } catch (err) {
      console.error(`Failed to process ${String(field)}:`, err);
      alert(`Failed to process image. Please try a different image.`);
    }
  };

  return (
    <div className="relative space-y-6 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7585]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E8E8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border border-[#E8E8E8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 text-[#1A1A1A] font-medium cursor-pointer"
          >
            <option value="Name">Sort by: Name (A-Z)</option>
            <option value="PriceAsc">Sort by: Price (Low to High)</option>
            <option value="PriceDesc">Sort by: Price (High to Low)</option>
            <option value="Carat">Sort by: Purity</option>
            <option value="Category">Sort by: Category (A-Z)</option>
          </select>
        </div>
        <button 
          onClick={() => openEditor(null)}
          className="inline-flex items-center w-full sm:w-auto justify-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white text-sm font-medium rounded-xl hover:bg-[#8A6E2F] transition-colors shrink-0"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#7A7585] bg-[#FDFAF5]">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">SKU / Specs</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium text-center">Media</th>
                <th className="px-5 py-3 font-medium text-center">Featured</th>
                <th className="px-5 py-3 font-medium text-center">New</th>
                <th className="px-5 py-3 font-medium text-right">Price</th>
                <th className="px-5 py-3 font-medium text-right">Views</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => openEditor(p)} className="border-t border-[#E8E8E8]/50 hover:bg-[#FDFAF5]/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E8E8E8]/40 flex items-center justify-center text-[#A09DAB] shrink-0 overflow-hidden">
                        {p.primaryImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.primaryImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} />
                        )}
                      </div>
                      <span className="font-medium text-[#1A1A1A]">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#7A7585]">{p.sku}</p>
                    <p className="text-[10px] text-amber-600 font-semibold">{p.carat} • {p.colour}</p>
                  </td>

                  <td className="px-5 py-4">
                    {p.category ? (
                      <>
                        <p className="font-medium text-[#1A1A1A]">{p.category}</p>
                        {p.subCategory && (
                          <p className="text-[10px] text-[#7A7585]">{p.subCategory}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-[#A09DAB] text-xs">—</span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                       {p.primaryImage && <span title="Has Image"><ImageIcon size={14} className="text-[#1A1A1A]" /></span>}
                    </div>
                  </td>

                  {/* Toggles */}
                  <td className="px-5 py-4 text-center">
                    <button 
                      onClick={(e) => toggleFlag(e, p.id, 'isFeatured')}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                        p.isFeatured ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Star size={16} className={p.isFeatured ? "fill-current" : ""} />
                    </button>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button 
                      onClick={(e) => toggleFlag(e, p.id, 'isNewArrival')}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                        p.isNewArrival ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <Sparkles size={16} />
                    </button>
                  </td>

                  <td className="px-5 py-4 text-right font-medium">₹{p.price.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[#7A7585]">
                      <Eye size={13} /> {p.views.toLocaleString("en-IN")}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      p.status === "Active" ? "bg-green-50 text-green-700" : p.status === "Draft" ? "bg-amber-50 text-amber-700" : "bg-[#E8E8E8]/40 text-[#7A7585]"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-[#7A7585] text-sm">No products found.</p>
        )}
      </div>

      {/* PRODUCT EDITOR SLIDE-OVER */}
      {editingParams && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={closeEditor} />
          
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#F5F3EF] z-50 shadow-2xl flex flex-col transition-transform transform translate-x-0">
            <div className="flex bg-white items-center justify-between px-6 py-4 border-b border-[#E8E8E8] shrink-0">
              <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Tag size={18} className="text-[#C9A84C]" />
                {editingParams.id.startsWith('P') && !products.some(p => p.id === editingParams.id) ? "New Product" : "Edit Product"}
              </h2>
              <button onClick={closeEditor} className="p-2 text-[#7A7585] hover:bg-[#E8E8E8]/50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Media Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Product Media</h3>
                
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'primary' as const, label: 'Image 1 (Primary)', field: 'primaryImage' as const, color: '[#C9A84C]' },
                    { key: 'hover' as const, label: 'Image 2 (Hover)', field: 'hoverImage' as const, color: 'purple-400' },
                    { key: 'image3' as const, label: 'Image 3', field: 'image3' as const, color: 'blue-400' },
                    { key: 'image4' as const, label: 'Image 4', field: 'image4' as const, color: 'emerald-400' },
                    { key: 'image5' as const, label: 'Image 5', field: 'image5' as const, color: 'rose-400' },
                    { key: 'image6' as const, label: 'Image 6', field: 'image6' as const, color: 'cyan-400' },
                  ]).map(({ key, label, field, color }) => (
                    <div key={key} className="bg-white p-3 rounded-2xl border border-[#E8E8E8]">
                      <label className="block text-[10px] font-medium text-[#7A7585] mb-1.5 text-center">{label}</label>
                      <label
                        className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group ${
                          editingParams[field] ? `border-${color}` : 'border-[#E8E8E8] hover:border-[#C9A84C]/50 bg-[#FDFAF5]'
                        }`}
                      >
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMediaUpload(e, key)} />
                        {editingParams[field] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={editingParams[field]!} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-xs font-medium">Replace</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-3">
                            <Upload size={18} className="text-[#A09DAB] mb-1 mx-auto" />
                            <span className="text-[10px] text-[#7A7585]">Upload</span>
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>

              </div>

              {/* Core Details */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Product Context</h3>
                <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Product Name</label>
                      <input 
                        type="text" 
                        value={editingParams.name}
                        onChange={(e) => setEditingParams({...editingParams, name: e.target.value})}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">SKU Code</label>
                      <input 
                        type="text" 
                        value={editingParams.sku}
                        onChange={(e) => setEditingParams({...editingParams, sku: e.target.value})}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        title="Auto-generated on creation, but free to override."
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* Category — loaded from Firestore /categories */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Category</label>
                      <select
                        value={editingParams.category}
                        onChange={(e) => {
                          const newCategory = e.target.value;
                          const lower = newCategory.toLowerCase();
                          // Match Rings / Silver Rings / Wedding Rings — but NOT Earrings.
                          const isRingCategory = lower.includes('ring') && !lower.includes('earring');
                          // Only auto-fill if the admin hasn't already typed something custom.
                          const shouldAutofillSizes =
                            isRingCategory && !(editingParams.ringSizes || '').trim();
                          const defaultRingSizes = Array.from(
                            { length: 15 },
                            (_, i) => String(i + 11)
                          ).join(', ');
                          setEditingParams({
                            ...editingParams,
                            category: newCategory,
                            subCategory: '',
                            ringSizes: shouldAutofillSizes
                              ? defaultRingSizes
                              : editingParams.ringSizes,
                          });
                        }}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      >
                        <option value="">Select category</option>
                        {dbCategories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {dbCategories.length === 0 && (
                          <option disabled value="">No categories yet — add in Categories page</option>
                        )}
                      </select>
                    </div>
                    {/* Sub-category — shown only when selected category has sub-categories */}
                    {(() => {
                      const activeCat = dbCategories.find((c) => c.name === editingParams.category);
                      if (!activeCat?.subCategories?.length) return null;
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Sub-category</label>
                          <select
                            value={editingParams.subCategory ?? ""}
                            onChange={(e) =>
                              setEditingParams({ ...editingParams, subCategory: e.target.value })
                            }
                            className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                          >
                            <option value="">— None —</option>
                            {activeCat.subCategories.map((sub) => (
                              <option key={sub.id} value={sub.name}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Metal</label>
                      <input
                        type="text"
                        value={editingParams.colour}
                        onChange={(e) => setEditingParams({...editingParams, colour: e.target.value})}
                        placeholder="e.g. Silver"
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Metal 2 (optional)</label>
                      <input
                        type="text"
                        value={editingParams.colour2 || ''}
                        onChange={(e) => setEditingParams({...editingParams, colour2: e.target.value})}
                        placeholder="e.g. Rose Gold"
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                    </div>
                    {/* Plating — optional surface treatment shown to customers */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Plating</label>
                      <select
                        value={editingParams.plating || ''}
                        onChange={(e) => setEditingParams({ ...editingParams, plating: e.target.value })}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      >
                        <option value="">— None —</option>
                        <option value="Gold Plated">Gold Plated</option>
                        <option value="Silver Plated">Silver Plated</option>
                        <option value="Gold & Silver Plated">Gold &amp; Silver Plated</option>
                      </select>
                    </div>
                    {/* Ring Sizes — comma-separated; populates the size selector on the customer product page (use for rings). */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Ring Sizes</label>
                      <input
                        type="text"
                        value={editingParams.ringSizes || ''}
                        onChange={(e) => setEditingParams({ ...editingParams, ringSizes: e.target.value })}
                        placeholder="e.g. 6, 7, 8, 9, 10, 11"
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                      <p className="text-[10px] text-[#A09DAB] mt-1">Comma-separated. Leave empty for non-ring products.</p>
                    </div>
                    {/* Chain Option — show "With Chain / Without Chain" toggle (use for pendants). */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Pendant Chain Option</label>
                      <label className="flex items-center gap-2 bg-[#F5F3EF] rounded-xl px-4 py-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingParams.chainOption}
                          onChange={(e) => setEditingParams({ ...editingParams, chainOption: e.target.checked })}
                          className="rounded border-[#A09DAB] text-[#C9A84C] focus:ring-[#C9A84C]/40"
                        />
                        <span className="text-sm">Offer &ldquo;With Chain / Without Chain&rdquo;</span>
                      </label>
                    </div>
                    {/* Chain Price — only meaningful when chainOption is enabled */}
                    {editingParams.chainOption && (
                      <div>
                        <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Chain Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          value={editingParams.chainPrice ?? 0}
                          onChange={(e) =>
                            setEditingParams({
                              ...editingParams,
                              chainPrice: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder="e.g. 500"
                          className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        />
                        <p className="text-[10px] text-[#A09DAB] mt-1">Added to the base price when customer picks &ldquo;With Chain&rdquo;.</p>
                      </div>
                    )}
                    {/* Gold Plating Surcharge — every product gets a Silver/Gold plating toggle on the customer page */}
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Gold Plating Surcharge (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={editingParams.goldPlatingPrice ?? 200}
                        onChange={(e) =>
                          setEditingParams({
                            ...editingParams,
                            goldPlatingPrice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder="200"
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                      <p className="text-[10px] text-[#A09DAB] mt-1">
                        Added to base price when customer picks &ldquo;Gold Plated&rdquo;. Silver Plated stays at base. Default ₹200.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Purity</label>
                      <input 
                        type="text" 
                        value={editingParams.carat}
                        onChange={(e) => setEditingParams({...editingParams, carat: e.target.value})}
                        placeholder="e.g. 18K"
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-amber-700 font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Dimensions */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Physical Dimensions</h3>
                <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Size/Length</label>
                    <input 
                      type="text" 
                      value={editingParams.size}
                      onChange={(e) => setEditingParams({...editingParams, size: e.target.value})}
                      placeholder="e.g. US 7, 18in"
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Weight</label>
                    <input 
                      type="text" 
                      value={editingParams.weight}
                      onChange={(e) => setEditingParams({...editingParams, weight: e.target.value})}
                      placeholder="e.g. 4.2g"
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Height</label>
                    <input 
                      type="text" 
                      value={editingParams.height}
                      onChange={(e) => setEditingParams({...editingParams, height: e.target.value})}
                      placeholder="e.g. 1.2cm"
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Width</label>
                    <input 
                      type="text" 
                      value={editingParams.width}
                      onChange={(e) => setEditingParams({...editingParams, width: e.target.value})}
                      placeholder="e.g. 0.4cm"
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Radius (Optional for Rings)</label>
                    <input 
                      type="text" 
                      value={editingParams.radius}
                      onChange={(e) => setEditingParams({...editingParams, radius: e.target.value})}
                      placeholder="e.g. 0.85cm"
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                </div>
              </div>

              {/* Policies & Tags */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Policies & Tags</h3>
                <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Search Tags</label>
                    <input 
                      type="text" 
                      value={editingParams.tags}
                      onChange={(e) => setEditingParams({...editingParams, tags: e.target.value})}
                      placeholder="e.g. classic, wedding, silver"
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Product Description</label>
                    <textarea
                      value={editingParams.description || ''}
                      onChange={(e) => setEditingParams({...editingParams, description: e.target.value})}
                      placeholder="Describe the product — material, design, occasion, etc."
                      rows={3}
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Guarantee / Warranty Note</label>
                    <textarea 
                      value={editingParams.warranty}
                      onChange={(e) => setEditingParams({...editingParams, warranty: e.target.value})}
                      placeholder="e.g. 1 Year free polish replacement"
                      rows={2}
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Engagement — Views only */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Engagement Stats</h3>
                <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8]">
                  <div className="max-w-sm">
                    <label className="block text-xs font-semibold text-[#7A7585] mb-2 flex items-center gap-1.5">
                      <Eye size={14} /> Views
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editingParams && setEditingParams({ ...editingParams, views: Math.max(0, editingParams.views - 1) })}
                        className="w-9 h-9 rounded-lg border border-[#E8E8E8] flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        value={editingParams?.views ?? 0}
                        onChange={(e) => editingParams && setEditingParams({ ...editingParams, views: Math.max(0, Number(e.target.value)) })}
                        className="flex-1 bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm text-center font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                      <button
                        type="button"
                        onClick={() => editingParams && setEditingParams({ ...editingParams, views: editingParams.views + 1 })}
                        className="w-9 h-9 rounded-lg border border-[#E8E8E8] flex items-center justify-center hover:bg-green-50 hover:border-green-200 hover:text-green-600 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing & Inventory */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-white p-6 rounded-2xl border border-[#E8E8E8]">
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Static Base M.R.P (₹)</label>
                  <input 
                    type="number" 
                    value={editingParams.price}
                    onChange={(e) => setEditingParams({...editingParams, price: Number(e.target.value)})}
                    className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 font-mono font-medium"
                    title="Regular fixed price if not using Market Sync."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5 flex items-center gap-1">
                    Making Charges (₹) <span className="w-1.5 h-1.5 bg-green-500 rounded-full" title="Active on Live Market Sync"></span>
                  </label>
                  <input 
                    type="number" 
                    value={editingParams.makingMargin || 0}
                    onChange={(e) => setEditingParams({...editingParams, makingMargin: Number(e.target.value)})}
                    className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 text-green-700 font-mono font-medium"
                    title="Fixed making charges isolated from raw silver cost."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5 flex items-center gap-1">
                    Shipping Cost (₹)
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Per-product shipping cost shown at checkout"></span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingParams.shippingCost ?? 99}
                    onChange={(e) =>
                      setEditingParams({
                        ...editingParams,
                        shippingCost: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-[#EEF4FF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-blue-700 font-mono font-medium"
                    title="0 = free shipping for this product. Checkout charges the highest shipping cost across all cart items."
                  />
                  <p className="text-[10px] text-[#A09DAB] mt-1">0 = Free. Checkout takes the max across cart items.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Status</label>
                  <select 
                    value={editingParams.status}
                    onChange={(e) => setEditingParams({...editingParams, status: e.target.value})}
                    className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                  >
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="px-6 py-5 border-t border-[#E8E8E8] bg-white gap-3 flex shrink-0">
              <button 
                onClick={cancelEditor}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#E8E8E8] text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveProduct}
                disabled={!editingParams.name || !editingParams.price || isSaving}
                className="flex-[2] flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Product Specs</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
      {/* 30-Day History Modal */}
      {historyViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setHistoryViewProduct(null)}
          />
          <div className="bg-white rounded-2xl w-full max-w-2xl relative z-10 p-6 shadow-2xl border border-[#E8E8E8]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A] flex items-center gap-2">
                  <Activity className="text-[#C9A84C]" size={20} />
                  30-Day Price Trend
                </h3>
                <p className="text-sm text-[#7A7585] mt-1">{historyViewProduct.name} ({historyViewProduct.sku})</p>
              </div>
              <button 
                onClick={() => setHistoryViewProduct(null)}
                className="p-2 hover:bg-[#F5F3EF] rounded-full text-[#7A7585] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={generate30DayData(historyViewProduct.price)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E8" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#A09DAB" }} dy={10} minTickGap={30} />
                  <YAxis domain={['dataMin - 100', 'dataMax + 100']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#A09DAB" }} width={60} tickFormatter={(val) => `₹${val}`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E8E8', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 600, color: '#C9A84C' }}
                    labelStyle={{ color: '#7A7585', fontSize: '12px' }}
                    formatter={(value) => [`₹${value ?? ''}`, 'Price']}
                  />
                  <Line type="monotone" name="Listed Price" dataKey="price" stroke="#C9A84C" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: "#1A1A1A" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm bg-[#FDFAF5] p-4 rounded-xl">
              <span className="text-[#7A7585]">Current Listed Price:</span>
              <span className="font-bold text-lg font-[family-name:var(--font-heading)] text-[#1A1A1A]">₹{historyViewProduct.price.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
