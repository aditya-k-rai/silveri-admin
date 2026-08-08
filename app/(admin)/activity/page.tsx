"use client";

import { useState, useEffect, useMemo } from "react";
import { ShoppingCart, Heart, Search, RefreshCcw, Loader2, Filter } from "lucide-react";
import { subscribeToActivity, ActivityEvent } from "@/lib/firebase/activityLog";
import Image from "next/image";

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

type FilterType = "all" | "cart" | "wishlist";
type FilterAction = "all" | "added" | "removed";

export default function AdminActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [actionFilter, setActionFilter] = useState<FilterAction>("all");

  useEffect(() => {
    const unsub = subscribeToActivity((data) => {
      setEvents(data);
      setLoading(false);
    }, 200);
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.userName.toLowerCase().includes(q) ||
          e.userEmail.toLowerCase().includes(q) ||
          e.productName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, typeFilter, actionFilter, search]);

  // Group stats
  const totalCart = events.filter((e) => e.type === "cart" && e.action === "added").length;
  const totalWishlist = events.filter((e) => e.type === "wishlist" && e.action === "added").length;
  const uniqueUsers = new Set(events.map((e) => e.userId)).size;

  return (
    <div className="space-y-6">

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ShoppingCart size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#1A1A1A]">{totalCart}</p>
            <p className="text-xs text-[#7A7585] mt-0.5">Cart Additions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Heart size={20} className="text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#1A1A1A]">{totalWishlist}</p>
            <p className="text-xs text-[#7A7585] mt-0.5">Wishlist Additions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
            <span className="text-[#C9A84C] font-bold text-lg">U</span>
          </div>
          <div>
            <p className="text-2xl font-semibold text-[#1A1A1A]">{uniqueUsers}</p>
            <p className="text-xs text-[#7A7585] mt-0.5">Unique Users</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7585]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user or product…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#F5F3EF] border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-[#7A7585] shrink-0" />
          {(["all", "cart", "wishlist"] as FilterType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-[#1A1A1A] text-white"
                  : "bg-[#F5F3EF] text-[#7A7585] hover:bg-[#E8E8E8]"
              }`}
            >
              {t === "all" ? "All Types" : t === "cart" ? "Cart" : "Wishlist"}
            </button>
          ))}
        </div>

        {/* Action Filter */}
        <div className="flex items-center gap-2">
          {(["all", "added", "removed"] as FilterAction[]).map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                actionFilter === a
                  ? a === "added"
                    ? "bg-green-600 text-white"
                    : a === "removed"
                    ? "bg-red-500 text-white"
                    : "bg-[#1A1A1A] text-white"
                  : "bg-[#F5F3EF] text-[#7A7585] hover:bg-[#E8E8E8]"
              }`}
            >
              {a === "all" ? "All Actions" : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">Activity Feed</h3>
            <p className="text-xs text-[#7A7585] mt-0.5">
              Real-time — {filtered.length} event{filtered.length !== 1 ? "s" : ""}
              {search || typeFilter !== "all" || actionFilter !== "all" ? " (filtered)" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCcw size={32} className="text-[#E8E8E8] mb-3" />
            <p className="text-sm text-[#7A7585]">
              {events.length === 0
                ? "No activity yet. Activity is recorded when logged-in users interact with products."
                : "No events match your filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E8E8]/60">
            {filtered.map((event) => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const isCart = event.type === "cart";
  const isAdded = event.action === "added";

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-[#FDFAF5]/60 transition-colors">
      {/* User Avatar */}
      <div className="shrink-0">
        {event.userPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.userPhoto}
            alt=""
            className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-sm font-semibold ring-2 ring-white shadow-sm">
            {(event.userName || "?")[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1A1A1A]">
          <span className="font-semibold">{event.userName || "Unknown"}</span>
          {" "}
          <span className={isAdded ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
            {isAdded ? "added" : "removed"}
          </span>
          {" "}
          <span className="font-medium text-[#1A1A1A]">{event.productName}</span>
          {" "}
          <span className="text-[#7A7585]">
            {isAdded ? "to" : "from"}{" "}
          </span>
          <span className={`font-medium ${isCart ? "text-blue-600" : "text-red-500"}`}>
            {isCart ? "Cart" : "Wishlist"}
          </span>
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-[#7A7585]">
          <span>{event.userEmail}</span>
          <span>·</span>
          <span title={formatDateTime(event.timestamp)}>{timeAgo(event.timestamp)}</span>
          <span>·</span>
          <span className="text-[#C9A84C] font-medium">₹{event.productPrice.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Product Image */}
      {event.productImage ? (
        <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-[#F5F3EF] border border-[#E8E8E8]">
          <Image
            src={event.productImage}
            alt={event.productName}
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        </div>
      ) : (
        <div className="shrink-0 w-11 h-11 rounded-xl bg-[#F5F3EF] border border-[#E8E8E8] flex items-center justify-center">
          {isCart ? (
            <ShoppingCart size={16} className="text-[#C9A84C]" />
          ) : (
            <Heart size={16} className="text-red-400" />
          )}
        </div>
      )}

      {/* Action Badge */}
      <div className="shrink-0">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${
            isCart
              ? "bg-blue-50 text-blue-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {isCart ? <ShoppingCart size={11} /> : <Heart size={11} />}
          {isCart ? "Cart" : "Wishlist"}
        </span>
      </div>

      {/* Timestamp (full, right side) */}
      <div className="shrink-0 text-right hidden md:block min-w-[130px]">
        <p className="text-xs text-[#7A7585]">
          {event.timestamp.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
        <p className="text-xs text-[#A09DAB] mt-0.5">
          {event.timestamp.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </p>
      </div>
    </div>
  );
}
