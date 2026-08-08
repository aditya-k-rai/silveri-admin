"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, Search, MessageSquare, Trash2, Reply, Loader2, X, ShieldCheck } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";
import {
  subscribeToAllReviews,
  setAdminReply,
  removeAdminReply,
  deleteReview,
} from "@/lib/firebase/reviews";
import type { Review } from "@/types";

type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";
type StatusFilter = "all" | "replied" | "unreplied";
type SortKey = "newest" | "oldest" | "rating-high" | "rating-low";

export default function AdminReviewsPage() {
  const { userDoc } = useAuthContext();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllReviews((data) => {
      setReviews(data);
      setLoading(false);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (ratingFilter !== "all") {
      const target = Number(ratingFilter);
      list = list.filter((r) => r.rating === target);
    }
    if (statusFilter === "replied") list = list.filter((r) => !!r.adminReply);
    if (statusFilter === "unreplied") list = list.filter((r) => !r.adminReply);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.comment.toLowerCase().includes(q) ||
          (r.title?.toLowerCase().includes(q) ?? false) ||
          r.productId.toLowerCase().includes(q)
      );
    }
    switch (sortKey) {
      case "oldest":      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); break;
      case "rating-high": list.sort((a, b) => b.rating - a.rating || b.createdAt.getTime() - a.createdAt.getTime()); break;
      case "rating-low":  list.sort((a, b) => a.rating - b.rating || b.createdAt.getTime() - a.createdAt.getTime()); break;
      default:            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return list;
  }, [reviews, ratingFilter, statusFilter, search, sortKey]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
    const unreplied = reviews.filter((r) => !r.adminReply).length;
    return { total, avg, unreplied };
  }, [reviews]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total reviews" value={stats.total} icon={<MessageSquare size={18} />} accent="bg-blue-50 text-blue-600" />
        <StatCard label="Average rating" value={stats.avg > 0 ? `${stats.avg.toFixed(1)} / 5` : "—"} icon={<Star size={18} />} accent="bg-amber-50 text-amber-600" />
        <StatCard label="Unreplied" value={stats.unreplied} icon={<Reply size={18} />} accent="bg-red-50 text-red-500" />
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7585]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reviewer, product, or text…"
            className="w-full pl-9 pr-4 py-2.5 bg-[#F5F3EF] border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value as RatingFilter)}
          className="bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
        >
          <option value="all">All ratings</option>
          <option value="5">5 ★</option>
          <option value="4">4 ★</option>
          <option value="3">3 ★</option>
          <option value="2">2 ★</option>
          <option value="1">1 ★</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
        >
          <option value="all">All status</option>
          <option value="unreplied">Unreplied</option>
          <option value="replied">Replied</option>
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="bg-[#F5F3EF] border border-transparent rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="rating-high">Highest rated</option>
          <option value="rating-low">Lowest rated</option>
        </select>
      </div>

      {/* Reviews list */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
          <h3 className="font-semibold text-[#1A1A1A]">Reviews ({filtered.length})</h3>
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="text-[#C9A84C] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-[#7A7585]">
            {reviews.length === 0 ? "No reviews yet." : "No reviews match your filters."}
          </div>
        ) : (
          <div className="divide-y divide-[#E8E8E8]/60">
            {filtered.map((r) => (
              <ReviewRow
                key={r.id}
                review={r}
                onReply={() => setReplyTarget(r)}
                onRemoveReply={async () => {
                  if (confirm("Remove your reply?")) await removeAdminReply(r.id);
                }}
                onDelete={async () => {
                  if (confirm("Permanently delete this review? The customer will not be notified.")) {
                    await deleteReview(r.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reply modal */}
      {replyTarget && (
        <ReplyModal
          review={replyTarget}
          adminName={userDoc?.name || "Silveri"}
          onClose={() => setReplyTarget(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E8E8] p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#1A1A1A]">{value}</p>
        <p className="text-xs text-[#7A7585] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ReviewRow({
  review,
  onReply,
  onRemoveReply,
  onDelete,
}: {
  review: Review;
  onReply: () => void;
  onRemoveReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {review.userPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={review.userPhoto} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#C9A84C]/10 flex items-center justify-center text-[#C9A84C] text-sm font-semibold shrink-0">
            {review.userName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-[#1A1A1A]">{review.userName}</span>
            {review.orderId && (
              <span title="Verified Purchase" className="text-emerald-600">
                <ShieldCheck size={12} />
              </span>
            )}
            <span className="text-[11px] text-[#7A7585]">·</span>
            <span className="text-[11px] text-[#7A7585]">
              {review.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="text-[11px] text-[#7A7585]">·</span>
            <Link href={`/product/${review.productId}`} className="text-[11px] text-[#C9A84C] hover:underline">
              View product
            </Link>
          </div>

          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={13} className={s <= review.rating ? "fill-amber-500 text-amber-500" : "text-[#E8E8E8]"} />
            ))}
          </div>

          {review.title && <p className="text-sm font-semibold text-[#1A1A1A] mb-1">{review.title}</p>}
          <p className="text-sm text-[#1A1A1A]/80 leading-relaxed whitespace-pre-line">{review.comment}</p>

          {/* Existing admin reply */}
          {review.adminReply && (
            <div className="mt-3 bg-[#FDFAF5] border-l-2 border-[#C9A84C] pl-3 pr-3 py-2.5 rounded-r-lg">
              <p className="text-[11px] font-semibold text-[#C9A84C] uppercase tracking-wider mb-1">
                {review.adminReply.adminName} replied · {review.adminReply.repliedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
              <p className="text-xs text-[#1A1A1A]/85 leading-relaxed whitespace-pre-line">{review.adminReply.text}</p>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={onReply}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C9A84C] hover:text-[#8A6E2F] transition-colors"
            >
              <Reply size={12} />
              {review.adminReply ? "Edit reply" : "Reply"}
            </button>
            {review.adminReply && (
              <button
                onClick={onRemoveReply}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A7585] hover:text-[#1A1A1A] transition-colors"
              >
                Remove reply
              </button>
            )}
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors ml-auto"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyModal({
  review,
  adminName,
  onClose,
}: {
  review: Review;
  adminName: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(review.adminReply?.text ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!text.trim() || text.trim().length < 3) {
      setError("Reply must be at least a few characters");
      return;
    }
    setSubmitting(true);
    try {
      await setAdminReply(review.id, { text: text.trim(), adminName });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save reply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
          <h3 className="font-semibold text-[#1A1A1A]">
            {review.adminReply ? "Edit reply" : "Reply to review"}
          </h3>
          <button onClick={onClose} className="text-[#7A7585] hover:text-[#1A1A1A]">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Quoted review */}
          <div className="bg-[#F5F3EF]/60 border border-[#E8E8E8] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[#1A1A1A]">{review.userName}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={11} className={s <= review.rating ? "fill-amber-500 text-amber-500" : "text-[#E8E8E8]"} />
                ))}
              </div>
            </div>
            <p className="text-xs text-[#1A1A1A]/80 line-clamp-3 whitespace-pre-line">{review.comment}</p>
          </div>

          <form onSubmit={submit}>
            <label className="block text-xs font-semibold text-[#7A7585] uppercase tracking-wider mb-2">
              Your reply (publicly visible as &ldquo;{adminName}&rdquo;)
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Thanks for the feedback! We're glad you love it…"
              className="w-full px-4 py-2.5 border border-[#E8E8E8] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C9A84C]/40 resize-none"
            />
            <p className="text-[10px] text-[#7A7585] mt-1 text-right">{text.length}/1000</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mt-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-[#E8E8E8] text-[#7A7585] hover:bg-[#F5F3EF] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-black transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving…" : review.adminReply ? "Update reply" : "Post reply"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
