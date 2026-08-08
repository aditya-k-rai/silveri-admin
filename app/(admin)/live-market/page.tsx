"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, RefreshCcw, DollarSign, Gem, Search, AlertTriangle, Clock } from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { fetchLiveMarketRates } from "@/app/(admin)/actions/market";
import { saveMarketRate, fetchRecentRates, MarketRateEntry } from "@/lib/firebase/marketRates";

interface ChartPoint {
  label: string;
  date: string;
  time: string;
  silverRate: number;
  usdInr: number;
}

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatChartLabel(date: Date): { label: string; date: string; time: string } {
  const d = formatDayLabel(date);
  const t = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { label: d, date: d, time: t };
}

// Keep only the latest entry per calendar day
function dedupeByDay(entries: MarketRateEntry[]): MarketRateEntry[] {
  const map = new Map<string, MarketRateEntry>();
  for (const entry of entries) {
    const key = getDayKey(entry.fetchedAt);
    const existing = map.get(key);
    if (!existing || entry.fetchedAt.getTime() > existing.fetchedAt.getTime()) {
      map.set(key, entry);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.fetchedAt.getTime() - b.fetchedAt.getTime());
}

function formatLastUpdated(date: Date): string {
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

export default function LiveMarketDashboard() {
  const [currentSilver, setCurrentSilver] = useState(0);
  const [currentUSD, setCurrentUSD] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [fredDate, setFredDate] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [previousSilver, setPreviousSilver] = useState(0);
  const [previousUSD, setPreviousUSD] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { products, setProducts, updateProduct } = useProductStore();
  const [search, setSearch] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const doSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await fetchLiveMarketRates();

      setSyncError(null);
      if (result.success && result.silverRate > 0) {
        const newSilver = result.silverRate;
        const newUSD = result.usdInrRate;
        const fetchedAt = new Date(result.fetchedAt);

        // Update previous values for diff
        setPreviousSilver(currentSilver || newSilver);
        setPreviousUSD(currentUSD || newUSD);

        setCurrentSilver(newSilver);
        setCurrentUSD(newUSD);
        setLastUpdated(fetchedAt);
        setFredDate(result.fredObservationDate || null);

        // Save to Firebase history
        await saveMarketRate({
          silverRate: newSilver,
          usdInr: newUSD,
          fetchedAt,
          fredObservationDate: result.fredObservationDate || undefined,
        });

        // Add/replace today's point in chart (one per day)
        const fmt = formatChartLabel(fetchedAt);
        const todayDateLabel = formatDayLabel(fetchedAt);
        const newPoint: ChartPoint = {
          ...fmt,
          silverRate: newSilver,
          usdInr: newUSD,
        };
        setChartData((prev) => {
          const withoutToday = prev.filter((p) => p.date !== todayDateLabel);
          return [...withoutToday, newPoint].slice(-40);
        });

        // Recalculate linked product prices
        const updatedProducts = products.map(p => {
          if (!p.isLinked) return p;
          const weightGm = parseFloat(p.weight) || 0;
          const rawSilverCost = weightGm * newSilver;
          const newTotal = Math.round(rawSilverCost + (p.makingMargin || 0));
          return { ...p, price: newTotal };
        });

        setProducts(updatedProducts);
      } else {
        console.error("Market API Fetch Failed: ", result.error);
        setSyncError(result.error || "API returned zero rates. Check your API keys.");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Network error";
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [currentSilver, currentUSD, products, setProducts]);

  const loadHistory = useCallback(async () => {
    const rawHistory = await fetchRecentRates(200);
    const history = dedupeByDay(rawHistory).slice(-40);
    if (history.length > 0) {
      const points = history.map((entry) => {
        const fmt = formatChartLabel(entry.fetchedAt);
        return {
          ...fmt,
          silverRate: entry.silverRate,
          usdInr: entry.usdInr,
        };
      });
      setChartData(points);

      const latest = history[history.length - 1];
      setCurrentSilver(latest.silverRate);
      setCurrentUSD(latest.usdInr);
      setLastUpdated(latest.fetchedAt);
      setFredDate(latest.fredObservationDate || null);

      if (history.length >= 2) {
        const prev = history[history.length - 2];
        setPreviousSilver(prev.silverRate);
        setPreviousUSD(prev.usdInr);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastSyncDate = new Date(latest.fetchedAt);
      lastSyncDate.setHours(0, 0, 0, 0);

      if (lastSyncDate.getTime() < today.getTime()) {
        await doSync();
      }
    } else {
      await doSync();
    }
  }, [doSync]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadHistory();
  }, [loadHistory]);

  const alreadySyncedToday = (() => {
    if (!lastUpdated) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = new Date(lastUpdated);
    lastDate.setHours(0, 0, 0, 0);
    return lastDate.getTime() >= today.getTime();
  })();

  const forceSync = () => {
    if (alreadySyncedToday) {
      const confirm = window.confirm(
        "Already synced today. API quota is limited to 90 requests/month (1 per day).\n\nAre you sure you want to use another request?"
      );
      if (!confirm) return;
    }
    doSync();
  };

  const toggleLink = (id: string, currentTargetWeightStr: string, currentMargin: number) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    const isNowLinked = !p.isLinked;
    if (isNowLinked) {
      const weightGm = parseFloat(currentTargetWeightStr) || 0;
      const newPrice = Math.round((weightGm * currentSilver) + currentMargin);
      updateProduct(id, { isLinked: true, price: newPrice });
    } else {
      updateProduct(id, { isLinked: false });
    }
  };

  const syncMargin = (id: string, newMargin: number, isCurrentlyLinked: boolean, weightStr: string) => {
    if (isCurrentlyLinked) {
      const weightGm = parseFloat(weightStr) || 0;
      const newPrice = Math.round((weightGm * currentSilver) + newMargin);
      updateProduct(id, { makingMargin: newMargin, price: newPrice });
    } else {
      updateProduct(id, { makingMargin: newMargin });
    }
  };

  // Metrics diffs
  const silverDiff = currentSilver - previousSilver;
  const usdDiff = currentUSD - previousUSD;

  return (
    <div className="space-y-6">

      {/* Header & Force Sync */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A]">Live Market Engine</h1>
          <p className="text-sm text-[#7A7585]">Configure dynamic pricing driven by real-time commodities.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-3">
              {alreadySyncedToday && (
                <span className="text-xs text-emerald-600 font-medium hidden sm:block">Synced today</span>
              )}
              {!alreadySyncedToday && (
                <span className="text-xs text-[#7A7585] hidden sm:block">Auto-syncs once daily on load</span>
              )}
              <button
                onClick={forceSync}
                disabled={isSyncing}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                  alreadySyncedToday
                    ? "bg-[#E8E8E8] text-[#7A7585] hover:bg-[#D4D4D8]"
                    : "bg-[#1A1A1A] text-white hover:bg-black"
                } ${isSyncing ? "opacity-75 cursor-not-allowed" : ""}`}
              >
                <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Fetching APIs..." : "Force API Sync"}
              </button>
            </div>
            <p className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle size={12} /> Quota: 90 requests/month (1 per day recommended)
            </p>
          </div>
        </div>
      </div>

      {/* Sync Error */}
      {syncError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">API Sync Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{syncError}</p>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7A7585] mb-1 flex items-center gap-2">
              <Gem size={16} className="text-[#C9A84C]" /> Silver Rate (Per Gram)
            </p>
            <h2 className="text-3xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A]">
              {currentSilver > 0 ? `â‚¹${currentSilver.toFixed(2)}` : "â€”"}
            </h2>
            {currentSilver > 0 && previousSilver > 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold mt-2 ${silverDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                {silverDiff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(silverDiff).toFixed(2)} vs last sync
              </div>
            )}
          </div>
          <div className="w-16 h-16 bg-[#C9A84C]/10 rounded-full flex items-center justify-center">
            <Gem size={32} className="text-[#C9A84C]" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#7A7585] mb-1 flex items-center gap-2">
              <DollarSign size={16} className="text-blue-500" /> Exchange Rate (USD to INR)
            </p>
            <h2 className="text-3xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A]">
              {currentUSD > 0 ? `â‚¹${currentUSD.toFixed(2)}` : "â€”"}
            </h2>
            {currentUSD > 0 && previousUSD > 0 && (
              <div className={`flex items-center gap-1 text-sm font-semibold mt-2 ${usdDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
                {usdDiff >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(usdDiff).toFixed(2)} vs last sync
              </div>
            )}
            {fredDate && (
              <p className="text-[10px] text-amber-600 mt-1">FRED data from: {fredDate}</p>
            )}
          </div>
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <span className="text-blue-500 font-bold text-xl">$</span>
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      <div className="bg-white p-6 rounded-2xl border border-[#E8E8E8] shadow-sm">
        <h3 className="text-[#1A1A1A] font-semibold mb-6 flex items-center gap-2">Market Rate History <span className="text-xs font-normal text-[#7A7585]">(Last 40 days)</span></h3>
        {chartData.length > 0 ? (
          <>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E8" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#A09DAB" }}
                    dy={10}
                    minTickGap={40}
                  />
                  <YAxis yAxisId="left" domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A09DAB" }} />
                  <YAxis yAxisId="right" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#A09DAB" }} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E8E8', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 600 }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line yAxisId="left" type="monotone" name="Silver Rate (â‚¹/g)" dataKey="silverRate" stroke="#C9A84C" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" name="USD/INR Exch" dataKey="usdInr" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Last Updated Info */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E8E8E8]">
              <div className="flex items-center gap-2 text-xs text-[#7A7585]">
                <Clock size={14} />
                <span>
                  Last updated: {lastUpdated ? formatLastUpdated(lastUpdated) : "â€”"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#A09DAB]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded bg-[#C9A84C] inline-block"></span> Silver (â‚¹/g)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded bg-[#3b82f6] inline-block"></span> USD/INR
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm text-[#7A7585]">
            {isSyncing ? "Fetching live rates..." : "No rate history yet. The API syncs automatically once daily, or click \"Force API Sync\" to fetch now."}
          </div>
        )}
      </div>

      {/* Linked Products Rules */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="p-6 border-b border-[#E8E8E8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#1A1A1A]">Dynamic Pricing Registry</h3>
            <p className="text-xs text-[#7A7585] mt-1">If &ldquo;Market Sync&rdquo; is active, product price equates to: <strong>(Weight &times; Live Silver Rate) + Making Margin</strong>.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7585]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search registry..."
              className="w-full pl-10 pr-4 py-2 bg-[#F5F3EF] border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#7A7585] bg-[#FDFAF5]">
                <th className="px-6 py-3 font-medium">Product Base</th>
                <th className="px-6 py-3 font-medium">Recorded Weight</th>
                <th className="px-6 py-3 font-medium text-center">Market Sync</th>
                <th className="px-6 py-3 font-medium">Making Margin (â‚¹)</th>
                <th className="px-6 py-3 font-medium text-right shadow-sm">Final Listed Price</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const weightGm = parseFloat(p.weight) || 0;
                const rawSilverCost = weightGm * currentSilver;
                const activeMargin = p.makingMargin || 0;

                return (
                  <tr key={p.id} className="border-t border-[#E8E8E8] hover:bg-[#FDFAF5]/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1A1A1A]">{p.name}</p>
                      <p className="text-xs text-[#A09DAB]">{p.carat} {p.colour}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium">{p.weight}</td>

                    {/* Toggle */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleLink(p.id, p.weight, activeMargin)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${p.isLinked ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${p.isLinked ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[#7A7585]">â‚¹</span>
                        <input
                          type="number"
                          value={activeMargin}
                          onChange={(e) => syncMargin(p.id, Number(e.target.value), p.isLinked, p.weight)}
                          disabled={!p.isLinked}
                          className="w-24 px-3 py-1.5 bg-[#F5F3EF] border border-[#E8E8E8] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 disabled:opacity-50 font-medium"
                        />
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right bg-amber-50/10">
                      <p className="text-lg font-[family-name:var(--font-heading)] font-bold text-[#1A1A1A]">â‚¹{p.price.toLocaleString('en-IN')}</p>
                      {p.isLinked && (
                        <p className="text-[10px] text-[#A09DAB] mt-0.5" title={`Silver Base: ${rawSilverCost.toFixed(2)} + Margin: ${activeMargin}`}>
                          {rawSilverCost.toFixed(0)} (Base) + {activeMargin} (Make)
                        </p>
                      )}
                      {!p.isLinked && (
                        <p className="text-[10px] text-[#A09DAB] mt-0.5">Manual Pricing (Frozen)</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-[#7A7585] text-sm">
              No products found in the pricing registry.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

