"use client";

import React, { useState } from "react";
import { MessageCircle, Search, ChevronDown, ChevronUp, Image as ImageIcon, CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

interface CustomRequest {
  id: string;
  phone: string;
  date: string;
  purity: string;
  weight: number;
  size: string;
  complexity: string;
  estimatedTotal: number;
  description: string;
  images: string[];
  status: "New" | "Contacted" | "Accepted" | "Rejected";
}

const INITIAL_REQUESTS: CustomRequest[] = [];

const STATUSES = ["New", "Contacted", "Accepted", "Rejected"];

export default function AdminCustomOrdersPage() {
  const [requests, setRequests] = useState<CustomRequest[]>(INITIAL_REQUESTS);
  const [activeTab, setActiveTab] = useState("New");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = requests.filter(r => 
    r.status === activeTab && 
    (r.id.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search))
  );

  const updateStatus = (id: string, newStatus: CustomRequest["status"]) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    setExpandedId(null);
  };

  return (
    <div className="space-y-6 min-h-screen">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-[family-name:var(--font-heading)] font-semibold text-[#1A1A1A]">Custom Jewelry Requests</h1>
          <p className="text-sm text-[#7A7585]">Manage specialized bespoke orders</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7585]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or Phone..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E8E8] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              activeTab === s
                ? "bg-[#C9A84C] text-white"
                : "bg-white border border-[#E8E8E8] text-[#7A7585] hover:text-[#1A1A1A]"
            }`}
          >
            {s}
            <span className="ml-1.5 text-xs opacity-80">
              ({requests.filter((r) => r.status === s).length})
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E8E8E8] overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#7A7585] bg-[#FDFAF5]">
                <th className="px-5 py-3 font-medium w-8"></th>
                <th className="px-5 py-3 font-medium">Req ID</th>
                <th className="px-5 py-3 font-medium">WhatsApp Contact</th>
                <th className="px-5 py-3 font-medium">Requested Specs</th>
                <th className="px-5 py-3 font-medium text-center">Images</th>
                <th className="px-5 py-3 font-medium text-right">Est. Quote</th>
                <th className="px-5 py-3 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(req => {
                const isExpanded = expandedId === req.id;

                return (
                  <React.Fragment key={req.id}>
                    <tr onClick={() => setExpandedId(isExpanded ? null : req.id)} className={`cursor-pointer transition-colors ${isExpanded ? 'bg-[#FDFAF5]/30' : 'border-t border-[#E8E8E8]/50 hover:bg-[#FDFAF5]/50'}`}>
                      <td className="px-5 py-4 text-[#7A7585]">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#1A1A1A]">{req.id}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-green-700 font-medium bg-green-50 w-fit px-2.5 py-1 rounded-full text-xs">
                          <MessageCircle size={14} />
                          {req.phone}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[#1A1A1A] font-medium">{req.purity} <span className="text-[#7A7585] font-normal mx-1">•</span> {req.weight}g</div>
                        <div className="text-xs text-[#A09DAB]">Size: {req.size || "N/A"}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs text-[#7A7585] font-medium bg-[#F5F3EF] px-2 py-1 rounded-md border border-[#E8E8E8]">
                          <ImageIcon size={12} /> {req.images.length}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-[#C9A84C]">₹{req.estimatedTotal.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-right text-xs text-[#7A7585]">{req.date}</td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[#FDFAF5]/30 border-b border-[#E8E8E8]/50">
                        <td colSpan={7} className="px-5 py-6">
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            
                            {/* Images Grid */}
                            <div className="md:col-span-1 space-y-3">
                              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7A7585]">Reference Images</h4>
                              <div className="grid grid-cols-2 gap-2">
                                {req.images.map((img, idx) => (
                                  <div key={idx} className="aspect-square relative rounded-xl border border-[#E8E8E8] overflow-hidden bg-white">
                                    <Image src={img} alt="Ref" fill className="object-cover" />
                                  </div>
                                ))}
                                {req.images.length === 0 && (
                                  <div className="col-span-2 text-xs text-[#A09DAB] italic p-4 bg-white border border-[#E8E8E8] rounded-xl text-center">
                                    No images provided.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="md:col-span-2 space-y-5">
                              <div className="bg-white p-5 rounded-2xl border border-[#E8E8E8] shadow-sm">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7A7585] mb-2">Customer Description</h4>
                                <p className="text-sm leading-relaxed text-[#1A1A1A]">{req.description}</p>
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-[#E8E8E8]">
                                  <span className="block text-[10px] uppercase text-[#7A7585] mb-1">Make Complexity</span>
                                  <span className="text-sm font-semibold text-[#1A1A1A]">{req.complexity}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-[#E8E8E8]">
                                  <span className="block text-[10px] uppercase text-[#7A7585] mb-1">Purity & Mass</span>
                                  <span className="text-sm font-semibold text-[#1A1A1A]">{req.purity} ({req.weight}g)</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-[#E8E8E8]">
                                  <span className="block text-[10px] uppercase text-[#7A7585] mb-1">Size Target</span>
                                  <span className="text-sm font-semibold text-[#1A1A1A]">{req.size || "None"}</span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-3 pt-2">
                                <a 
                                  href={`https://wa.me/${req.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 bg-[#25D366] text-white py-3 rounded-xl flex items-center justify-center gap-2 font-semibold hover:bg-[#128C7E] transition-colors"
                                >
                                  <MessageCircle size={18} /> Chat on WhatsApp
                                </a>
                                
                                {req.status === "New" && (
                                  <button onClick={() => updateStatus(req.id, "Contacted")} className="flex-1 bg-[#1A1A1A] text-white py-3 rounded-xl font-medium hover:bg-black transition-colors">
                                    Mark as Contacted
                                  </button>
                                )}
                                {req.status === "Contacted" && (
                                  <>
                                    <button onClick={() => updateStatus(req.id, "Accepted")} className="px-6 py-3 bg-green-50 text-green-700 rounded-xl font-medium flex items-center gap-2 hover:bg-green-100">
                                      <CheckCircle size={16} /> Accept Order
                                    </button>
                                    <button onClick={() => updateStatus(req.id, "Rejected")} className="px-6 py-3 bg-red-50 text-red-700 rounded-xl font-medium flex items-center gap-2 hover:bg-red-100">
                                      <XCircle size={16} /> Reject
                                    </button>
                                  </>
                                )}
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
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#7A7585] text-sm">No {activeTab.toLowerCase()} requests found.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
