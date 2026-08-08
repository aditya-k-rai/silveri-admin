"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  MapPin,
  Phone,
  Package,
  CreditCard,
  Clock,
  X,
  CheckCircle,
  Send,
  MessageCircle,
  Loader2,
  Search,
  Eye,
  EyeOff,
  Columns3,
  SlidersHorizontal,
  Plus,
  Calendar,
  ArrowDownUp,
} from "lucide-react";
import { subscribeToOrders, updateOrder } from "@/lib/firebase/orders";
import { Order, OrderEvent } from "@/types";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

// ─── Constants ──────────────────────────────────────────────────
const FILTER_TABS = ["All", "Unfulfilled", "Unpaid", "Open", "Archived", "Failed Payments"] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  paid: { bg: "bg-[#F1F1F1]", text: "text-[#1A1A1A]", dot: "bg-[#8A8A8A]", label: "Paid" },
  pending: { bg: "bg-[#FFF4E5]", text: "text-[#B86E00]", dot: "bg-[#B86E00]", label: "Payment pending" },
  voided: { bg: "bg-[#F1F1F1]", text: "text-[#1A1A1A]", dot: "bg-[#8A8A8A]", label: "Voided" },
  refunded: { bg: "bg-[#F1F1F1]", text: "text-[#1A1A1A]", dot: "bg-[#8A8A8A]", label: "Refunded" },
};

const FULFILLMENT_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  unfulfilled: { bg: "bg-[#FFF4E5]", text: "text-[#B86E00]", dot: "bg-[#B86E00]", label: "Unfulfilled" },
  fulfilled: { bg: "bg-[#F1F1F1]", text: "text-[#1A1A1A]", dot: "bg-[#8A8A8A]", label: "Fulfilled" },
  partial: { bg: "bg-[#FFF4E5]", text: "text-[#B86E00]", dot: "bg-[#B86E00]", label: "Partial" },
};

// ─── Types ──────────────────────────────────────────────────────
interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: "order", label: "Order", visible: true },
  { id: "flags", label: "Flags", visible: true },
  { id: "date", label: "Date", visible: true },
  { id: "customer", label: "Customer", visible: true },
  { id: "channel", label: "Channel", visible: true },
  { id: "total", label: "Total", visible: true },
  { id: "payment", label: "Payment status", visible: true },
  { id: "fulfillment", label: "Fulfillment status", visible: true },
  { id: "items", label: "Items", visible: true },
  { id: "delivery_status", label: "Delivery status", visible: true },
  { id: "delivery_method", label: "Delivery method", visible: true },
];

// ─── Helpers ────────────────────────────────────────────────────
function getPaymentStatus(order: Order) {
  if (order.status === "cancelled") return PAYMENT_STYLES.voided;
  if (order.paymentId) return PAYMENT_STYLES.paid;
  return PAYMENT_STYLES.pending;
}

function getFulfillmentStatus(order: Order) {
  if (order.status === "delivered") return FULFILLMENT_STYLES.fulfilled;
  if (order.status === "shipped") return FULFILLMENT_STYLES.fulfilled;
  return FULFILLMENT_STYLES.unfulfilled;
}

function getDeliveryStatus(order: Order) {
  if (order.status === "delivered") return "Delivered";
  return "";
}

function getDeliveryMethod(order: Order) {
  if (order.address && order.status !== "cancelled") return "Standard";
  if (order.status === "cancelled") return "Shipping not required";
  return "Shipping not required";
}

function formatOrderDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && now.getDate() === date.getDate()) {
    return `Today at ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
    return `Yesterday at ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
  }
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

function formatAddress(order: Order): string {
  if (!order.address) return "—";
  const a = order.address;
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}

// ─── Mini Sparkline ─────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-[60px] h-[24px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`mini-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#mini-${color})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Status Badge Component ─────────────────────────────────────
function StatusBadge({ bg, text, dot, label }: { bg: string; text: string; dot: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Column Editor
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [editingColumns, setEditingColumns] = useState(false);
  const [tempColumns, setTempColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Status Update Modal
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{ id: string; currentStatus: string; newStatus: string } | null>(null);
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = subscribeToOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  // ─── Filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = orders;

    const isFailedPayment = (o: Order) =>
      o.status === "cancelled" ||
      (o.status === "pending" && !o.paymentId && o.paymentMethod !== "COD" && !o.isCOD);

    // Tab filter
    if (activeTab === "Failed Payments") {
      result = result.filter(isFailedPayment);
    } else {
      // Filter OUT failed payments for other tabs
      result = result.filter((o) => !isFailedPayment(o));

      if (activeTab === "Unfulfilled") {
        result = result.filter((o) => o.status === "pending" || o.status === "processing");
      } else if (activeTab === "Unpaid") {
        result = result.filter((o) => !o.paymentId);
      } else if (activeTab === "Open") {
        result = result.filter((o) => o.status !== "delivered");
      } else if (activeTab === "Archived") {
        result = result.filter((o) => o.status === "delivered");
      }
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.orderNumber || "").toLowerCase().includes(q) ||
          (o.customerName || "").toLowerCase().includes(q) ||
          (o.customerEmail || "").toLowerCase().includes(q) ||
          o.items.some((i) => (i.sku || "").toLowerCase().includes(q))
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "order":
          // Sort by orderSequence (numeric) when available, fall back to string compare
          if (a.orderSequence !== undefined && b.orderSequence !== undefined) {
            cmp = a.orderSequence - b.orderSequence;
          } else if (a.orderNumber && b.orderNumber) {
            cmp = a.orderNumber.localeCompare(b.orderNumber);
          } else {
            cmp = a.id.localeCompare(b.id);
          }
          break;
        case "date":
          cmp = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "items": {
          const aItems = a.items.reduce((s, i) => s + i.quantity, 0);
          const bItems = b.items.reduce((s, i) => s + i.quantity, 0);
          cmp = aItems - bItems;
          break;
        }
        case "destination":
          cmp = (a.address?.city || "").localeCompare(b.address?.city || "");
          break;
        case "customer":
          cmp = (a.customerName || "").localeCompare(b.customerName || "");
          break;
        case "payment":
          cmp = (a.paymentId ? "paid" : "pending").localeCompare(b.paymentId ? "paid" : "pending");
          break;
        case "fulfillment":
          cmp = a.status.localeCompare(b.status);
          break;
        case "total":
          cmp = a.total - b.total;
          break;
        case "channel":
          cmp = 0; // All same channel
          break;
        default:
          cmp = a.createdAt.getTime() - b.createdAt.getTime();
      }
      return sortDesc ? -cmp : cmp;
    });
  }, [orders, activeTab, searchQuery, sortBy, sortDesc]);

  // ─── Analytics metrics (today) ────────────────────────────────
  const todayMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isFailedPayment = (o: Order) =>
      o.status === "cancelled" ||
      (o.status === "pending" && !o.paymentId && o.paymentMethod !== "COD" && !o.isCOD);
    const todayOrders = orders.filter((o) => o.createdAt >= today && !isFailedPayment(o));
    const totalItems = todayOrders.reduce((s, o) => s + o.items.reduce((q, i) => q + i.quantity, 0), 0);
    const fulfilled = todayOrders.filter((o) => o.status === "shipped" || o.status === "delivered").length;
    const delivered = todayOrders.filter((o) => o.status === "delivered").length;
    const returns = 0; // No returns data in current schema

    return {
      orders: todayOrders.length,
      items: totalItems,
      returns,
      fulfilled,
      delivered,
    };
  }, [orders]);

  // Sparkline data (last 7 days)
  const sparkData = useMemo(() => {
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const isFailedPayment = (o: Order) =>
        o.status === "cancelled" ||
        (o.status === "pending" && !o.paymentId && o.paymentMethod !== "COD" && !o.isCOD);
      data.push(orders.filter((o) => o.createdAt >= d && o.createdAt < next && !isFailedPayment(o)).length);
    }
    return data;
  }, [orders]);

  // ─── Column Editor Handlers ───────────────────────────────────
  const openColumnEditor = () => {
    setTempColumns(columns.map((c) => ({ ...c })));
    setEditingColumns(true);
  };

  const saveColumns = () => {
    setColumns(tempColumns);
    setEditingColumns(false);
  };

  const cancelColumnEdit = () => {
    setEditingColumns(false);
  };

  const toggleColumnVisibility = (id: string) => {
    setTempColumns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...tempColumns];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setTempColumns(updated);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  // ─── Status Update Handlers ───────────────────────────────────
  const openStatusModal = (e: React.ChangeEvent<HTMLSelectElement>, id: string, currentStatus: string) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;
    const now = new Date();
    setEventDate(now.toISOString().split("T")[0]);
    setEventTime(now.toTimeString().split(" ")[0].slice(0, 5));
    setEventNote("");
    setNotifyCustomer(true);
    setPendingStatusUpdate({ id, currentStatus, newStatus });
  };

  const confirmStatusUpdate = async () => {
    if (!pendingStatusUpdate) return;
    const order = orders.find((o) => o.id === pendingStatusUpdate.id);
    if (!order) return;
    const [hours, minutes] = eventTime.split(":");
    const h = parseInt(hours);
    const formattedTime = `${h % 12 || 12}:${minutes} ${h >= 12 ? "PM" : "AM"}`;
    const newEvent: OrderEvent = {
      status: STATUS_LABELS[pendingStatusUpdate.newStatus] || pendingStatusUpdate.newStatus,
      date: eventDate,
      time: formattedTime,
      note: eventNote || undefined,
      customerNotified: notifyCustomer,
    };
    await updateOrder(pendingStatusUpdate.id, {
      status: pendingStatusUpdate.newStatus as Order["status"],
      events: [...(order.events || []), newEvent],
      updatedAt: new Date(),
    });
    setPendingStatusUpdate(null);
  };

  const handleWhatsAppNotify = () => {
    if (!pendingStatusUpdate) return;
    const order = orders.find((o) => o.id === pendingStatusUpdate.id);
    if (!order) return;
    const hours = new Date().getHours();
    let greeting = "Evening";
    if (hours < 12) greeting = "Morning";
    else if (hours < 17) greeting = "Afternoon";
    const phone = order.customerPhone || order.address?.phone || "";
    const cleanPhone = phone.replace(/\D/g, "");
    const customerName = order.customerName || order.address?.fullName || "Customer";
    const message = `Good ${greeting} ${customerName}! 🌟\n\nYour order *${order.id}* from *Silveri* has been updated to: *${STATUS_LABELS[pendingStatusUpdate.newStatus] || pendingStatusUpdate.newStatus}*.${eventNote ? `\n\n📝 _Note: ${eventNote}_` : ""}\n\n📍 *Status Date:* ${eventDate} at ${eventTime}\n\nYou can track your live order progress here:\n${window.location.origin}/order/${order.id}\n\nThank you for choosing Silveri! ✨`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  // ─── Visible columns ─────────────────────────────────────────
  const visibleCols = columns.filter((c) => c.visible);

  // ─── Render cell content ──────────────────────────────────────
  const renderCell = (col: ColumnDef, o: Order) => {
    const totalQty = o.items.reduce((s, i) => s + i.quantity, 0);
    switch (col.id) {
      case "order":
        return (
          <span className="font-semibold text-[#1A1A1A] font-mono text-xs">
            #{o.orderNumber || o.id}
          </span>
        );
      case "flags":
        return null; // Placeholder column for flags
      case "date":
        return <span className="text-[#7A7585]">{formatOrderDate(o.createdAt)}</span>;
      case "customer":
        return <span className="text-[#1A1A1A]">{o.customerName || o.address?.fullName || "—"}</span>;
      case "channel":
        return <span className="text-[#7A7585]">Online Store</span>;
      case "total":
        return <span className="text-[#1A1A1A]">₹{o.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>;
      case "payment": {
        const ps = getPaymentStatus(o);
        return <StatusBadge {...ps} />;
      }
      case "fulfillment": {
        const fs = getFulfillmentStatus(o);
        return <StatusBadge {...fs} />;
      }
      case "items":
        return <span className="text-[#7A7585]">{totalQty} item{totalQty !== 1 ? "s" : ""}</span>;
      case "delivery_status": {
        const ds = getDeliveryStatus(o);
        return ds ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#1A1A1A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8A8A8A]"></span>
            {ds}
          </span>
        ) : null;
      }
      case "delivery_method":
        return <span className="text-[#7A7585]">{getDeliveryMethod(o)}</span>;
      default:
        return null;
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
    <div className="space-y-5 -mt-2">
      {/* ─── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A] flex items-center gap-2">
          <Package size={20} className="text-[#7A7585]" />
          Orders
        </h1>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-[#1A1A1A] border border-[#E8E8E8] rounded-lg hover:bg-[#FAFAFA] transition-colors">
            Export
          </button>
          <button className="px-4 py-2 text-sm font-medium text-[#1A1A1A] border border-[#E8E8E8] rounded-lg hover:bg-[#FAFAFA] transition-colors flex items-center gap-1.5">
            More actions
            <ChevronDown size={14} />
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-[#1A1A1A] rounded-lg hover:bg-black transition-colors">
            Create order
          </button>
        </div>
      </div>

      {/* ─── Analytics Bar ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
        <div className="flex divide-x divide-[#E8E8E8]">
          <div className="px-5 py-4 flex items-center gap-3">
            <Calendar size={14} className="text-[#7A7585]" />
            <span className="text-sm font-medium text-[#1A1A1A]">Today</span>
          </div>
          {[
            { label: "Orders", value: todayMetrics.orders, suffix: "" },
            { label: "Items ordered", value: todayMetrics.items, suffix: "" },
            { label: "Returns", value: todayMetrics.returns, suffix: "₹", prefix: true },
            { label: "Orders fulfilled", value: todayMetrics.fulfilled, suffix: "" },
            { label: "Orders delivered", value: todayMetrics.delivered, suffix: "" },
          ].map((m) => (
            <div key={m.label} className="flex-1 px-5 py-4 flex items-center justify-between min-w-0">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A] truncate">{m.label}</p>
                <p className="text-sm text-[#7A7585]">
                  {m.prefix ? `${m.suffix}${m.value}` : `${m.value}${m.suffix}`}{" "}
                  <span className="text-[#A1A1AA]">—</span>
                </p>
              </div>
              <MiniSparkline data={sparkData} color="#1A8CFF" />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Filter Tabs + Actions ───────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E8E8E8] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-0">
          <div className="flex items-center gap-0.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab
                    ? "bg-[#F5F3EF] text-[#1A1A1A]"
                    : "text-[#7A7585] hover:text-[#1A1A1A] hover:bg-[#FAFAFA]"
                }`}
              >
                {tab}
              </button>
            ))}
            <button className="px-2.5 py-2 text-[#7A7585] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition-colors">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsSearching(!isSearching);
                if (!isSearching) setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="p-2 text-[#7A7585] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition-colors"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="p-2 text-[#7A7585] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition-colors"
              title={sortDesc ? "Oldest first" : "Newest first"}
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              onClick={openColumnEditor}
              className="p-2 text-[#7A7585] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition-colors"
              title="Edit columns"
            >
              <Columns3 size={16} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="p-2 text-[#7A7585] hover:text-[#1A1A1A] hover:bg-[#FAFAFA] rounded-lg transition-colors"
                title="Sort"
              >
                <ArrowDownUp size={16} />
              </button>

              {/* Sort Dropdown */}
              {showSortMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-[#E8E8E8] rounded-xl shadow-xl w-[220px] py-2">
                    <p className="px-4 py-2 text-sm font-semibold text-[#1A1A1A]">Sort by</p>
                    {[
                      { id: "order", label: "Order number" },
                      { id: "date", label: "Date" },
                      { id: "items", label: "Items" },
                      { id: "destination", label: "Destination" },
                      { id: "customer", label: "Customer name" },
                      { id: "payment", label: "Payment status" },
                      { id: "fulfillment", label: "Fulfillment status" },
                      { id: "total", label: "Total" },
                      { id: "channel", label: "Channel" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors"
                      >
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          sortBy === opt.id ? "border-[#1A1A1A]" : "border-[#D4D4D8]"
                        }`}>
                          {sortBy === opt.id && <span className="w-2 h-2 rounded-full bg-[#1A1A1A]"></span>}
                        </span>
                        {opt.label}
                      </button>
                    ))}
                    <div className="border-t border-[#E8E8E8] mt-1 pt-1">
                      <button
                        onClick={() => { setSortDesc(false); setShowSortMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          !sortDesc ? "text-[#1A1A1A] font-medium bg-[#FAFAFA]" : "text-[#7A7585] hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <span className="text-base">↑</span>
                        Oldest to newest
                      </button>
                      <button
                        onClick={() => { setSortDesc(true); setShowSortMenu(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          sortDesc ? "text-[#1A1A1A] font-medium bg-[#FAFAFA]" : "text-[#7A7585] hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <span className="text-base">↓</span>
                        Newest to oldest
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {isSearching && (
          <div className="mx-4 mt-3 mb-1">
            <div className="flex items-center gap-3 border-2 border-[#1A8CFF] rounded-xl px-4 py-2.5">
              <Search size={16} className="text-[#7A7585] shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Searching all orders"
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-[#A1A1AA]"
              />
              <button
                onClick={() => { setIsSearching(false); setSearchQuery(""); }}
                className="text-sm font-medium text-[#7A7585] hover:text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <span className="text-sm text-[#A1A1AA]">Save as</span>
            </div>
            <button className="mt-2 mb-1 text-xs font-medium text-[#7A7585] hover:text-[#1A1A1A] px-1 transition-colors">
              Add filter +
            </button>
          </div>
        )}

        {/* ─── Column Editor Mode ─────────────────────────────── */}
        {editingColumns ? (
          <div>
            {/* Faded tabs + Cancel/Save */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-[#E8E8E8]">
              <div className="flex items-center gap-0.5 opacity-30 pointer-events-none">
                {FILTER_TABS.map((tab) => (
                  <span key={tab} className="px-3.5 py-2 text-sm font-medium text-[#7A7585]">{tab}</span>
                ))}
                <span className="px-2.5 py-2 text-[#7A7585]"><Plus size={16} /></span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={cancelColumnEdit} className="text-sm font-medium text-[#7A7585] hover:text-[#1A1A1A] transition-colors">
                  Cancel
                </button>
                <button onClick={saveColumns} className="text-sm font-medium text-[#1A1A1A] hover:text-[#C9A84C] transition-colors">
                  Save
                </button>
              </div>
            </div>

            {/* Draggable column headers + data */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-t border-[#E8E8E8]">
                    {tempColumns.map((col, idx) => (
                      <th
                        key={col.id}
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`px-4 py-3 text-left font-medium whitespace-nowrap cursor-grab active:cursor-grabbing select-none border-r border-[#E8E8E8] last:border-r-0 transition-all ${
                          dragIdx === idx ? "bg-[#F5F3EF] shadow-inner" : "bg-white"
                        } ${!col.visible ? "opacity-30" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#1A1A1A] text-sm">{col.label}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleColumnVisibility(col.id); }}
                            className="ml-auto text-[#A1A1AA] hover:text-[#1A1A1A] transition-colors shrink-0"
                            title={col.visible ? "Hide column" : "Show column"}
                          >
                            {col.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 8).map((o) => (
                    <tr key={o.id} className="border-t border-[#E8E8E8]/60">
                      {tempColumns.map((col) => (
                        <td
                          key={col.id}
                          className={`px-4 py-3 whitespace-nowrap border-r border-[#E8E8E8]/40 last:border-r-0 transition-opacity ${
                            !col.visible ? "opacity-15" : ""
                          }`}
                        >
                          {renderCell(col, o)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── Data Table ─────────────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-[#E8E8E8]">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="w-4 h-4 rounded border-[#D4D4D8] accent-[#1A1A1A]" />
                  </th>
                  {visibleCols.map((col) => (
                    <th key={col.id} className="px-4 py-3 text-left font-medium text-[#1A1A1A] whitespace-nowrap">
                      {col.label}
                      {col.id === "date" && (
                        <button onClick={() => setSortDesc(!sortDesc)} className="ml-1 inline-flex text-[#7A7585]">
                          {sortDesc ? "↓" : "↑"}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const isExpanded = expandedOrder === o.id;
                  return (
                    <React.Fragment key={o.id}>
                      <tr
                        onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                        className={`border-t border-[#E8E8E8]/50 cursor-pointer transition-colors ${
                          isExpanded ? "bg-[#FAFAFA]" : "hover:bg-[#FAFAFA]/60"
                        }`}
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="w-4 h-4 rounded border-[#D4D4D8] accent-[#1A1A1A]" />
                        </td>
                        {visibleCols.map((col) => (
                          <td key={col.id} className="px-4 py-3 whitespace-nowrap">
                            {renderCell(col, o)}
                          </td>
                        ))}
                      </tr>

                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr className="bg-[#FAFAFA] border-t border-[#E8E8E8]/30">
                          <td colSpan={visibleCols.length + 1} className="px-6 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                              {/* Items */}
                              <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] mb-4">
                                  <Package size={16} className="text-[#C9A84C]" /> Items
                                </h4>
                                <div className="space-y-4">
                                  {o.items.map((item, idx) => (
                                    <div key={`${item.productId}-${idx}`} className="pb-4 border-b border-[#F0F0F0] last:border-0 last:pb-0">
                                      {/* Name + price row */}
                                      <div className="flex justify-between items-start gap-2 mb-2">
                                        <p className="text-sm font-semibold text-[#1A1A1A] leading-snug">{item.name}</p>
                                        <span className="text-sm font-bold text-[#1A1A1A] shrink-0 tabular-nums">
                                          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                                        </span>
                                      </div>
                                      {/* SKU badge */}
                                      {item.sku && (
                                        <div className="mb-2">
                                          <span className="inline-flex items-center gap-1 bg-[#1A1A1A] text-white text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md tracking-wider">
                                            SKU: {item.sku}
                                          </span>
                                        </div>
                                      )}
                                      {/* Variant chips row */}
                                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7A7585] bg-[#F5F3EF] border border-[#E8E8E8] px-2 py-0.5 rounded-full">
                                          Qty: {item.quantity}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#7A7585] bg-[#F5F3EF] border border-[#E8E8E8] px-2 py-0.5 rounded-full">
                                          ₹{item.price.toLocaleString("en-IN")} each
                                        </span>
                                        {item.size && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#1A1A1A] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                            📐 Size {item.size}
                                          </span>
                                        )}
                                        {item.plating && (
                                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                            item.plating === "gold"
                                              ? "text-amber-800 bg-amber-50 border-amber-200"
                                              : "text-slate-700 bg-slate-50 border-slate-200"
                                          }`}>
                                            ✦ {item.plating === "gold" ? "Gold Plated" : "Silver Plated"}
                                          </span>
                                        )}
                                        {item.chain && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                            ⛓ {item.chain === "with" ? "With Chain" : "Without Chain"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {/* Order totals */}
                                  <div className="pt-3 border-t border-[#E8E8E8] space-y-1.5">
                                    {o.discount > 0 && (
                                      <div className="flex justify-between text-xs text-emerald-700">
                                        <span>Discount{o.promoCode ? ` (${o.promoCode})` : ""}</span>
                                        <span>-₹{o.discount.toLocaleString("en-IN")}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between text-xs text-[#7A7585]">
                                      <span>Shipping</span>
                                      <span>{o.shipping === 0 ? "Free" : `₹${o.shipping.toLocaleString("en-IN")}`}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-semibold pt-1">
                                      <span className="text-sm">Total</span>
                                      <span className="text-[#C9A84C] text-sm tabular-nums">₹{o.total.toLocaleString("en-IN")}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Contact + Address + Payment */}
                              <div className="space-y-4">
                                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
                                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] mb-3">
                                    <Phone size={16} className="text-blue-500" /> Contact
                                  </h4>
                                  <p className="text-sm text-[#444]">{o.customerPhone || o.address?.phone || "—"}</p>
                                  <p className="text-sm text-[#444]">{o.customerEmail || "—"}</p>
                                </div>
                                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
                                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] mb-3">
                                    <MapPin size={16} className="text-rose-500" /> Address
                                  </h4>
                                  <p className="text-sm text-[#444] leading-relaxed">{formatAddress(o)}</p>
                                </div>
                                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
                                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] mb-3">
                                    <CreditCard size={16} className="text-green-600" /> Payment
                                  </h4>
                                  <p className="text-sm text-[#444]">
                                    Status: <span className={o.paymentId ? "text-green-600 font-medium" : "text-[#B86E00] font-medium"}>{o.paymentId ? "Paid" : "Pending"}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Timeline + Status Change */}
                              <div className="space-y-4">
                                <div className="bg-white border border-[#E8E8E8] rounded-xl p-5">
                                  <h4 className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] mb-4">
                                    <Clock size={16} className="text-purple-600" /> Timeline
                                  </h4>
                                  {o.events && o.events.length > 0 ? (
                                    <div className="space-y-4">
                                      {o.events.map((ev, idx) => (
                                        <div key={idx} className="relative pl-6">
                                          {idx !== o.events!.length - 1 && (
                                            <div className="absolute left-[9px] top-6 bottom-[-20px] w-px bg-[#E8E8E8] z-0"></div>
                                          )}
                                          <div className={`absolute left-0 top-1 w-[19px] h-[19px] rounded-full flex items-center justify-center z-10 ${idx === o.events!.length - 1 ? "bg-[#C9A84C]" : "bg-[#E8E8E8]"}`}>
                                            <div className="w-2 h-2 rounded-full bg-white"></div>
                                          </div>
                                          <div>
                                            <span className="text-sm font-semibold text-[#1A1A1A]">{ev.status}</span>
                                            <span className="text-[10px] text-[#A09DAB] ml-2">{ev.date} {ev.time}</span>
                                            {ev.note && (
                                              <p className="text-xs text-[#7A7585] mt-1 bg-[#F5F3EF] px-2.5 py-1.5 rounded-md">
                                                &ldquo;{ev.note}&rdquo;
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[#7A7585] italic">No events yet.</p>
                                  )}
                                </div>

                                {/* Status Update Dropdown */}
                                <div className="bg-white border border-[#E8E8E8] rounded-xl p-4">
                                  <label className="block text-xs font-semibold text-[#7A7585] mb-2">Update Status</label>
                                  <select
                                    value={o.status}
                                    onChange={(e) => openStatusModal(e, o.id, o.status)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/50 cursor-pointer font-medium"
                                  >
                                    {["pending", "processing", "shipped", "delivered", "cancelled"].map((s) => (
                                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                    ))}
                                  </select>
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
        )}

        {filtered.length === 0 && !editingColumns && (
          <p className="text-center py-10 text-[#7A7585] text-sm">No orders found.</p>
        )}
      </div>

      {/* ═══ STATUS UPDATE MODAL ═══════════════════════════════ */}
      {pendingStatusUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPendingStatusUpdate(null)} />
          <div className="bg-white rounded-2xl w-full max-w-md relative z-10 p-6 shadow-2xl border border-[#E8E8E8]">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A]">Update Status</h3>
                <p className="text-sm text-[#7A7585] mt-1">
                  Order {pendingStatusUpdate.id} &#10142;{" "}
                  <span className="font-semibold text-[#C9A84C]">
                    {STATUS_LABELS[pendingStatusUpdate.newStatus] || pendingStatusUpdate.newStatus}
                  </span>
                </p>
              </div>
              <button onClick={() => setPendingStatusUpdate(null)} className="p-2 hover:bg-[#F5F3EF] rounded-full text-[#7A7585]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Time</label>
                  <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#7A7585] mb-1.5">Note (Optional)</label>
                <textarea value={eventNote} onChange={(e) => setEventNote(e.target.value)} placeholder="e.g. Tracking ID: AW309192" rows={2} className="w-full bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 resize-none" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${notifyCustomer ? "bg-amber-500" : "bg-white border border-[#E8E8E8]"}`}>
                  {notifyCustomer && <CheckCircle size={14} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={notifyCustomer} onChange={() => setNotifyCustomer(!notifyCustomer)} />
                <div>
                  <span className="text-sm font-semibold text-amber-900 block">Notify Customer</span>
                  <span className="text-[10px] text-amber-700/80 block">SMS / Email notification</span>
                </div>
              </label>
              <button onClick={handleWhatsAppNotify} className="flex items-center justify-center gap-3 w-full p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-700 hover:bg-green-500/20 transition-colors">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                  <MessageCircle size={16} />
                </div>
                <div className="text-left flex-1">
                  <span className="text-sm font-semibold block">Notify via WhatsApp</span>
                  <span className="text-[10px] opacity-70 block">Pre-filled message template</span>
                </div>
                <Send size={14} className="opacity-40" />
              </button>
            </div>

            <button onClick={confirmStatusUpdate} className="w-full py-3 bg-[#1A1A1A] text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors">
              Save Tracking Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
