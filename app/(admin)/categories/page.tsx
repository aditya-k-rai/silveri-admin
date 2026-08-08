"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  X,
  Upload,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  FolderTree,
  Navigation,
} from "lucide-react";
import {
  subscribeToCategories,
  saveCategory,
  updateCategory,
  deleteCategory as deleteCategoryFromDB,
  Category,
  SubCategory,
} from "@/lib/firebase/categories";

// ─── Image compression ──────────────────────────────────────────
const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let result = canvas.toDataURL("image/webp", quality);
      if (!result.startsWith("data:image/webp")) result = canvas.toDataURL("image/jpeg", quality);
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formImage, setFormImage] = useState<string | null>(null);
  const [formSubs, setFormSubs] = useState<SubCategory[]>([]);
  const [formShowInNav, setFormShowInNav] = useState(false);
  const [formNavOrder, setFormNavOrder] = useState<number>(99);

  // Expanded category (for viewing subs in the grid)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToCategories((data) => {
      setCategories(data);
      setLoading(false);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // ─── Editor Handlers ──────────────────────────────────────────
  const openEditor = (cat: Category | null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormName(cat.name);
      setFormSlug(cat.slug);
      setFormImage(cat.image);
      setFormSubs(cat.subCategories.map((s) => ({ ...s })));
      setFormShowInNav(cat.showInNav ?? false);
      setFormNavOrder(cat.navOrder ?? 99);
    } else {
      const newCat: Category = {
        id: `cat_${Date.now()}`,
        name: "",
        slug: "",
        image: null,
        productCount: 0,
        subCategories: [],
        showInNav: false,
        navOrder: 99,
      };
      setEditingCategory(newCat);
      setFormName("");
      setFormSlug("");
      setFormImage(null);
      setFormSubs([]);
      setFormShowInNav(false);
      setFormNavOrder(99);
    }
  };

  const closeEditor = () => {
    setEditingCategory(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Image too large. Max 4MB.");
      return;
    }
    try {
      const base64 = await compressImage(file);
      setFormImage(base64);
    } catch {
      alert("Failed to process image.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  // ─── Sub-category Handlers ────────────────────────────────────
  const addSubCategory = () => {
    setFormSubs([
      ...formSubs,
      { id: `sub_${Date.now()}`, name: "", slug: "" },
    ]);
  };

  const updateSub = (idx: number, field: "name" | "slug", value: string) => {
    const updated = [...formSubs];
    updated[idx] = { ...updated[idx], [field]: value };
    // Auto-generate slug from name
    if (field === "name") {
      updated[idx].slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    setFormSubs(updated);
  };

  const removeSub = (idx: number) => {
    setFormSubs(formSubs.filter((_, i) => i !== idx));
  };

  // ─── Quick Nav Toggle (saves without opening editor) ─────────
  const toggleShowInNav = async (cat: Category) => {
    const updates = { showInNav: !cat.showInNav };
    await updateCategory(cat.id, updates);
  };

  const updateNavOrder = async (cat: Category, order: number) => {
    await updateCategory(cat.id, { navOrder: order });
  };

  // ─── Save ─────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editingCategory || !formName || !formSlug) return;
    setSaving(true);
    try {
      const catToSave: Category = {
        ...editingCategory,
        name: formName,
        slug: formSlug,
        image: formImage,
        subCategories: formSubs.filter((s) => s.name.trim()),
        showInNav: formShowInNav,
        navOrder: formNavOrder,
      };
      await saveCategory(catToSave);
      closeEditor();
    } catch (err) {
      console.error("Failed to save category:", err);
      alert("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteCategoryFromDB(id);
      setDeleteConfirm(null);
      if (editingCategory?.id === id) closeEditor();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete category.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7A7585]">
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"} &middot;{" "}
            {categories.reduce((s, c) => s + c.subCategories.length, 0)} sub-categories
          </p>
        </div>
        <button
          onClick={() => openEditor(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white text-sm font-medium rounded-xl hover:bg-[#8A6E2F] transition-colors"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* ─── Categories List ─────────────────────────────────── */}
      <div className="space-y-3">
        {categories.map((cat) => {
          const isExpanded = expandedId === cat.id;
          return (
            <div
              key={cat.id}
              className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden hover:border-[#C9A84C]/40 transition-colors"
            >
              {/* Category Row */}
              <div className="flex items-center gap-4 p-4">
                {/* Image */}
                <div className="w-14 h-14 rounded-xl bg-[#E8E8E8]/30 shrink-0 overflow-hidden flex items-center justify-center">
                  {cat.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <FolderTree size={20} className="text-[#A09DAB]" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-[#1A1A1A]">
                    {cat.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#7A7585] mt-0.5">
                    <span>/{cat.slug}</span>
                    <span className="w-1 h-1 rounded-full bg-[#D4D4D8]"></span>
                    <span>{cat.productCount} products</span>
                    <span className="w-1 h-1 rounded-full bg-[#D4D4D8]"></span>
                    <span>{cat.subCategories.length} sub-categories</span>
                  </div>
                </div>

                {/* Nav Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Show in Nav Toggle */}
                  <button
                    onClick={() => toggleShowInNav(cat)}
                    title={cat.showInNav ? 'Showing in Nav — click to hide' : 'Hidden from Nav — click to show'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      cat.showInNav
                        ? 'bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#8A6E2F]'
                        : 'bg-[#F5F3EF] border-[#E8E8E8] text-[#A09DAB] hover:border-[#C9A84C]/30'
                    }`}
                  >
                    <Navigation size={12} />
                    {cat.showInNav ? 'In Nav' : 'Hidden'}
                  </button>
                  {/* Nav Order */}
                  {cat.showInNav && (
                    <input
                      type="number"
                      min={1}
                      max={99}
                      defaultValue={cat.navOrder ?? 99}
                      onBlur={(e) => updateNavOrder(cat, Number(e.target.value) || 99)}
                      onClick={(e) => e.stopPropagation()}
                      title="Nav position (1 = leftmost)"
                      className="w-14 text-center text-xs font-mono bg-[#F5F3EF] border border-[#E8E8E8] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditor(cat)}
                    className="px-3.5 py-1.5 text-xs font-medium border border-[#E8E8E8] rounded-lg hover:bg-[#FAFAFA] text-[#1A1A1A] transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                    className="p-2 text-[#7A7585] hover:bg-[#FAFAFA] rounded-lg transition-colors"
                    title="View sub-categories"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat.id)}
                    className="p-2 text-[#A09DAB] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded Sub-categories */}
              {isExpanded && (
                <div className="border-t border-[#E8E8E8] bg-[#FDFAF5]/40 px-4 py-4">
                  {cat.subCategories.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#7A7585] uppercase tracking-wider mb-3">
                        Sub-categories
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {cat.subCategories.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center gap-3 bg-white border border-[#E8E8E8] rounded-xl px-4 py-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] shrink-0">
                              <FolderTree size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#1A1A1A] truncate">{sub.name}</p>
                              <p className="text-[10px] text-[#A09DAB]">/{sub.slug}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[#A09DAB] text-center py-4">
                      No sub-categories. Click &ldquo;Edit&rdquo; to add some.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && (
          <div className="bg-white border border-[#E8E8E8] rounded-2xl p-12 text-center">
            <FolderTree size={40} className="text-[#E8E8E8] mx-auto mb-4" />
            <p className="text-sm text-[#7A7585]">No categories yet. Create your first one.</p>
          </div>
        )}
      </div>

      {/* ═══ DELETE CONFIRMATION ═══════════════════════════════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="bg-white rounded-2xl w-full max-w-sm relative z-10 p-6 shadow-2xl border border-[#E8E8E8]">
            <h3 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A] mb-2">
              Delete Category?
            </h3>
            <p className="text-sm text-[#7A7585] mb-6">
              This will permanently delete this category and all its sub-categories. Products in this category won&apos;t be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#E8E8E8] text-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SLIDE-OVER EDITOR ════════════════════════════════ */}
      {editingCategory && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={closeEditor}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-[#F5F3EF] z-50 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex bg-white items-center justify-between px-6 py-4 border-b border-[#E8E8E8] shrink-0">
              <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <FolderTree size={18} className="text-[#C9A84C]" />
                {categories.some((c) => c.id === editingCategory.id) ? "Edit Category" : "Create Category"}
              </h2>
              <button
                onClick={closeEditor}
                className="p-2 text-[#7A7585] hover:bg-[#E8E8E8]/50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Category Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type.startsWith("image/")) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      if (fileRef.current) {
                        fileRef.current.files = dt.files;
                        fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                      }
                    }
                  }}
                  className={`w-full aspect-[2/1] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                    formImage ? "border-[#C9A84C]" : "border-[#E8E8E8] hover:border-[#C9A84C]/50 bg-[#FDFAF5]/50"
                  }`}
                >
                  {formImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formImage} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload size={24} className="text-[#A09DAB] mb-2" />
                      <span className="text-sm text-[#7A7585]">Click or drag to upload</span>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {formImage && (
                  <button onClick={() => setFormImage(null)} className="text-xs text-red-500 mt-2 hover:underline">
                    Remove Image
                  </button>
                )}
              </div>

              {/* Name & Slug */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Category Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (!categories.some((c) => c.id === editingCategory.id)) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                      }
                    }}
                    className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    placeholder="e.g. Earrings"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">URL Slug</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 text-[#7A7585]"
                    placeholder="e.g. earrings"
                  />
                </div>
              </div>

              {/* ─── Nav Display Settings ──────────────────────── */}
              <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] space-y-4">
                <h3 className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-2">
                  <Navigation size={14} className="text-[#C9A84C]" />
                  Navigation Bar Settings
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">Show in Nav Bar</p>
                    <p className="text-xs text-[#7A7585] mt-0.5">Display this category in the site navigation</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormShowInNav(!formShowInNav)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 ${
                      formShowInNav ? 'bg-[#C9A84C]' : 'bg-[#E8E8E8]'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      formShowInNav ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                {formShowInNav && (
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Nav Position (order)</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={formNavOrder}
                      onChange={(e) => setFormNavOrder(Number(e.target.value) || 1)}
                      className="w-28 bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      placeholder="1"
                    />
                    <p className="text-xs text-[#A09DAB] mt-1">Lower number = appears further left. e.g. 1 = first, 2 = second…</p>
                  </div>
                )}
              </div>

              {/* ─── Sub-categories Section ────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">
                    Sub-categories ({formSubs.length})
                  </h3>
                  <button
                    onClick={addSubCategory}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C9A84C] hover:text-[#8A6E2F] transition-colors"
                  >
                    <Plus size={14} /> Add Sub-category
                  </button>
                </div>

                {formSubs.length > 0 ? (
                  <div className="space-y-2">
                    {formSubs.map((sub, idx) => (
                      <div
                        key={sub.id}
                        className="bg-white border border-[#E8E8E8] rounded-xl p-4 flex items-start gap-3"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-xs font-semibold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => updateSub(idx, "name", e.target.value)}
                            className="w-full bg-[#F5F3EF] border border-transparent rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                            placeholder="Sub-category name"
                          />
                          <input
                            type="text"
                            value={sub.slug}
                            onChange={(e) => updateSub(idx, "slug", e.target.value)}
                            className="w-full bg-[#F5F3EF] border border-transparent rounded-lg px-3 py-2 text-xs font-mono text-[#7A7585] focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                            placeholder="url-slug"
                          />
                        </div>
                        <button
                          onClick={() => removeSub(idx)}
                          className="p-1.5 text-[#A09DAB] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 mt-0.5"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-[#E8E8E8] rounded-xl p-6 text-center">
                    <p className="text-sm text-[#A09DAB]">No sub-categories yet</p>
                    <button
                      onClick={addSubCategory}
                      className="mt-2 text-xs font-medium text-[#C9A84C] hover:underline"
                    >
                      + Add your first sub-category
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-[#E8E8E8] bg-white gap-3 flex shrink-0">
              <button
                onClick={closeEditor}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#E8E8E8] text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formName || !formSlug || saving}
                className="flex-[2] flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save Category</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
