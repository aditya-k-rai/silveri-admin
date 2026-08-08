"use client";

import React, { useState, useEffect } from "react";
import { Search, ShieldOff, Shield, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface Address {
  id?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isDefault?: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoURL: string;
  role: string;
  blocked: boolean;
  createdAt: Timestamp | Date | string | number | null;
  orderCount?: number;
  totalSpent?: number;
  wishlist?: string[];
  addresses?: Address[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(!!db);
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as UserData[];
      setUsers(data);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filtered = users.filter((u) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleBlock = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const user = users.find(u => u.id === id);
    if (!user || !db) return;
    const newBlocked = !user.blocked;
    await updateDoc(doc(db, "users", id), { blocked: newBlocked });
  };

  const toggleExpand = (id: string) => {
    setExpandedUser(expandedUser === id ? null : id);
  };

  const formatDate = (timestamp: UserData["createdAt"]) => {
    if (!timestamp) return "—";
    const date =
      timestamp instanceof Timestamp
        ? timestamp.toDate()
        : timestamp instanceof Date
        ? timestamp
        : new Date(timestamp);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7585]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E8E8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#7A7585] bg-[#FDFAF5]">
                <th className="px-5 py-3 font-medium w-8"></th>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Joined</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isExpanded = expandedUser === u.id;

                return (
                  <React.Fragment key={u.id}>
                    <tr onClick={() => toggleExpand(u.id)} className={`cursor-pointer hover:bg-[#FDFAF5]/50 transition-colors ${isExpanded ? 'bg-[#FDFAF5]/30' : 'border-t border-[#E8E8E8]/50'}`}>
                      <td className="px-5 py-4 text-[#7A7585]">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-xs font-semibold shrink-0">
                              {(u.name || u.email || '?')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[#1A1A1A]">{u.name || "—"}</p>
                            <p className="text-xs text-[#7A7585]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#7A7585]">{u.phone || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-silver-100 text-silver-600'
                        }`}>
                          {u.role || 'customer'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#7A7585]">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={(e) => toggleBlock(e, u.id)}
                            className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              u.blocked
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-red-50 text-red-700 hover:bg-red-100"
                            }`}
                          >
                            {u.blocked ? <Shield size={12} /> : <ShieldOff size={12} />}
                            {u.blocked ? "Unblock" : "Block"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[#FDFAF5]/30 border-b border-[#E8E8E8]/50">
                        <td colSpan={6} className="px-5 pb-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 pl-8">
                            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
                              <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Details</h4>
                              <div className="space-y-2 text-xs text-[#7A7585]">
                                <p>UID: <span className="font-mono text-[#1A1A1A]">{u.id}</span></p>
                                <p>Email: <span className="text-[#1A1A1A]">{u.email}</span></p>
                                <p>Phone: <span className="text-[#1A1A1A]">{u.phone || "Not set"}</span></p>
                                <p>Wishlist items: <span className="text-[#1A1A1A]">{u.wishlist?.length || 0}</span></p>
                                <p>Addresses: <span className="text-[#1A1A1A]">{u.addresses?.length || 0}</span></p>
                              </div>
                            </div>
                            <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
                              <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Status</h4>
                              <div className="space-y-2 text-xs text-[#7A7585]">
                                <p>Role: <span className="text-[#1A1A1A] font-medium">{u.role || 'customer'}</span></p>
                                <p>Blocked: <span className={u.blocked ? "text-red-600 font-medium" : "text-green-600 font-medium"}>{u.blocked ? "Yes" : "No"}</span></p>
                                <p>Joined: <span className="text-[#1A1A1A]">{formatDate(u.createdAt)}</span></p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-10 text-[#7A7585] text-sm">No users found.</p>
        )}
      </div>
    </div>
  );
}
