"use client";

import React, { useState } from "react";
import { Plus, X, Save, Tag } from "lucide-react";

interface Promo {
  id: string;
  code: string;
  type: string;
  discount: string;
  minOrder: number;
  maxDiscount: number | null;
  uses: number;
  limit: number;
  expiry: string;
  active: boolean;
}

const INITIAL_PROMOS: Promo[] = [];

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<Promo[]>(INITIAL_PROMOS);
  const [editingParams, setEditingParams] = useState<Promo | null>(null);

  const openEditor = (promo: Promo | null) => {
    if (promo) {
      setEditingParams({ ...promo });
    } else {
      setEditingParams({
        id: "NEW",
        code: "",
        type: "Percentage",
        discount: "",
        minOrder: 0,
        maxDiscount: null,
        uses: 0,
        limit: 100,
        expiry: "2026-12-31",
        active: true,
      });
    }
  };

  const closeEditor = () => setEditingParams(null);

  const savePromo = () => {
    if (!editingParams) return;
    if (editingParams.id === "NEW") {
      const newPromo = { ...editingParams, id: `pr${Date.now()}` };
      setPromos([newPromo, ...promos]);
    } else {
      setPromos((prev) => prev.map((p) => (p.id === editingParams.id ? editingParams : p)));
    }
    closeEditor();
  };

  return (
    <div className="relative space-y-6 min-h-screen">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#7A7585]">{promos.length} promo codes</p>
        <button
          onClick={() => openEditor(null)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white text-sm font-medium rounded-xl hover:bg-[#8A6E2F] transition-colors"
        >
          <Plus size={16} /> Add Promo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#7A7585] bg-[#FDFAF5]">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Discount</th>
                <th className="px-5 py-3 font-medium text-center">Uses</th>
                <th className="px-5 py-3 font-medium">Expiry</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} onClick={() => openEditor(p)} className="border-t border-[#E8E8E8]/50 hover:bg-[#FDFAF5]/50 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <span className="font-mono font-medium bg-[#E8E8E8]/30 px-2 py-0.5 rounded text-xs">
                      {p.code}
                    </span>
                  </td>
                  <td className="px-5 py-4">{p.type}</td>
                  <td className="px-5 py-4 font-medium">
                    {p.type === "Flat" ? `₹${p.discount}` : `${p.discount}%`}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {p.uses} / {p.limit}
                  </td>
                  <td className="px-5 py-4 text-[#7A7585]">{p.expiry}</td>
                  <td className="px-5 py-4 text-right">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        p.active ? "bg-green-50 text-green-700" : "bg-[#E8E8E8]/40 text-[#7A7585]"
                      }`}
                    >
                      {p.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {promos.length === 0 && (
            <p className="text-center py-10 text-[#7A7585] text-sm">No promo codes found.</p>
          )}
        </div>
      </div>

      {/* SLIDE-OVER EDITOR */}
      {editingParams && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity" onClick={closeEditor} />

          <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#F5F3EF] z-50 shadow-2xl flex flex-col transition-transform transform translate-x-0">
            <div className="flex bg-white items-center justify-between px-6 py-4 border-b border-[#E8E8E8] shrink-0">
              <h2 className="text-lg font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Tag size={18} className="text-[#C9A84C]" />
                {editingParams.id === "NEW" ? "Create Promo Code" : "Edit Promo Code"}
              </h2>
              <button onClick={closeEditor} className="p-2 text-[#7A7585] hover:bg-[#E8E8E8]/50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Promo Code</label>
                    <input
                      type="text"
                      value={editingParams.code}
                      onChange={(e) => setEditingParams({ ...editingParams, code: e.target.value.toUpperCase() })}
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 uppercase"
                      placeholder="e.g. WELCOME10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Discount Type</label>
                      <select
                        value={editingParams.type}
                        onChange={(e) => setEditingParams({ ...editingParams, type: e.target.value })}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      >
                        <option value="Percentage">Percentage</option>
                        <option value="Flat">Flat Amount</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Discount Value</label>
                      <input
                        type="number"
                        value={editingParams.discount}
                        onChange={(e) => setEditingParams({ ...editingParams, discount: e.target.value })}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        placeholder={editingParams.type === "Percentage" ? "10" : "200"}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Active Status</label>
                    <select
                      value={editingParams.active ? "true" : "false"}
                      onChange={(e) => setEditingParams({ ...editingParams, active: e.target.value === "true" })}
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    >
                      <option value="true">Active (Can be used)</option>
                      <option value="false">Disabled / Expired</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Conditions & Limits</h3>
                <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Min Order (₹)</label>
                      <input
                        type="number"
                        value={editingParams.minOrder}
                        onChange={(e) => setEditingParams({ ...editingParams, minOrder: Number(e.target.value) })}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Max Discount (₹)</label>
                      <input
                        type="number"
                        value={editingParams.maxDiscount === null ? "" : editingParams.maxDiscount}
                        onChange={(e) => setEditingParams({ ...editingParams, maxDiscount: e.target.value ? Number(e.target.value) : null })}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Current Uses</label>
                      <input
                        type="number"
                        value={editingParams.uses}
                        disabled
                        className="w-full bg-[#E8E8E8]/50 border border-transparent rounded-xl px-4 py-2.5 text-sm text-[#7A7585] cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Usage Limit</label>
                      <input
                        type="number"
                        value={editingParams.limit}
                        onChange={(e) => setEditingParams({ ...editingParams, limit: Number(e.target.value) })}
                        className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Expiry Date</label>
                    <input
                      type="date"
                      value={editingParams.expiry}
                      onChange={(e) => setEditingParams({ ...editingParams, expiry: e.target.value })}
                      className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-[#E8E8E8] bg-white gap-3 flex shrink-0">
              <button
                onClick={closeEditor}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#E8E8E8] text-[#1A1A1A] hover:bg-[#F5F3EF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePromo}
                disabled={!editingParams.code || !editingParams.discount}
                className="flex-[2] flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3 rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                <Save size={16} /> Save Promo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
