"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload, Save, Globe, Mail, MessageCircle, Loader2, X, Image as ImageIcon,
  Crop, Plus, Trash2, ArrowUp, ArrowDown, Video, Play, Sparkles, Link as LinkIcon, Check, Eye
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { uploadMediaSlideFile } from "@/lib/firebase/storage";
import { MediaSlide } from "@/types";
import dynamic from "next/dynamic";

// LogoCropEditor pulls in a canvas-heavy editor + DOM math that only renders
// when the admin chooses a file. Lazy-loading it keeps the Settings page's
// initial JS payload small — the chunk fetches the moment the picker opens.
const LogoCropEditor = dynamic(() => import("./LogoCropEditor"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
      <Loader2 className="text-white animate-spin" size={28} />
    </div>
  ),
});

const SETTINGS_DOC = "siteSettings";
const SETTINGS_COLLECTION = "settings";

const compressBanner = (file: File, maxWidth = 1920, quality = 0.75): Promise<string> => {
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

export default function AdminSettingsPage() {
  const [logo, setLogo] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [heroBanner, setHeroBanner] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [announcement, setAnnouncement] = useState("Free shipping on orders above ₹2,000!");
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [mediaSlides, setMediaSlides] = useState<MediaSlide[]>([]);
  const [mediaSlidesEnabled, setMediaSlidesEnabled] = useState(true);
  const [uploadingSlide, setUploadingSlide] = useState<number | null>(null);
  const [socials, setSocials] = useState({
    instagram: "",
    facebook: "",
    twitter: "",
    website: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  // Load settings from Firestore
  useEffect(() => {
    if (!db) { setLoading(false); return; }
    getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.logo) setLogo(data.logo);
        if (data.heroBanner) setHeroBanner(data.heroBanner);
        if (data.announcement !== undefined) setAnnouncement(data.announcement);
        if (data.announcementEnabled !== undefined) setAnnouncementEnabled(data.announcementEnabled);
        if (Array.isArray(data.mediaSlides)) setMediaSlides(data.mediaSlides);
        if (data.mediaSlidesEnabled !== undefined) setMediaSlidesEnabled(data.mediaSlidesEnabled);
        if (data.socials) setSocials((prev) => ({ ...prev, ...data.socials }));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert("Logo too large. Please use an image under 4MB.");
      return;
    }
    setPendingLogoFile(file);
    if (logoFileRef.current) logoFileRef.current.value = "";
  };

  const removeLogo = () => setLogo(null);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Image too large. Please use an image under 4MB.");
      return;
    }

    setUploading(true);
    try {
      const base64 = await compressBanner(file, 1920, 0.7);
      setHeroBanner(base64);
    } catch (err) {
      console.error("Failed to compress banner:", err);
      alert("Failed to process image. Please try another.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeBanner = () => {
    setHeroBanner(null);
  };

  // Media Slides Helpers
  const addSlide = (type: 'image' | 'video') => {
    setMediaSlides((prev) => [
      ...prev,
      {
        id: `slide_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        url: '',
        title: '',
        subtitle: '',
        link: '',
        active: true,
      },
    ]);
  };

  const removeSlide = (index: number) => {
    setMediaSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const moveSlide = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= mediaSlides.length) return;
    setMediaSlides((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const updateSlide = <K extends keyof MediaSlide>(index: number, key: K, value: MediaSlide[K]) => {
    setMediaSlides((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleSlideFile = async (index: number, file: File) => {
    if (!file) return;
    setUploadingSlide(index);
    try {
      const downloadUrl = await uploadMediaSlideFile(file);
      const isVideo = file.type.startsWith('video/');
      setMediaSlides((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          url: downloadUrl,
          type: isVideo ? 'video' : 'image',
        };
        return copy;
      });
    } catch (err) {
      console.error("Slide upload failed:", err);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploadingSlide(null);
    }
  };

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC), {
        logo,
        heroBanner,
        announcement,
        announcementEnabled,
        mediaSlides,
        mediaSlidesEnabled,
        socials,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
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
    <div className="space-y-8 max-w-3xl">
      {/* Website Logo */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg">Website Logo</h3>
            <p className="text-xs text-[#7A7585] mt-0.5">Shown next to &quot;Silveri&quot; in the customer header. Square crop, ideally a transparent PNG.</p>
          </div>
          {logo && (
            <button
              onClick={removeLogo}
              className="text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          )}
        </div>

        <div className="flex items-center gap-5">
          {/* Live preview */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-silver-900 flex items-center justify-center overflow-hidden">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="Logo preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-[family-name:var(--font-heading)] text-3xl font-bold">S</span>
              )}
            </div>
            <span className="text-[10px] text-[#7A7585]">Header preview</span>
          </div>

          <div className="flex-1">
            <button
              onClick={() => logoFileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E8] rounded-xl text-sm font-medium hover:bg-[#FDFAF5] transition-colors"
            >
              <Upload size={16} /> {logo ? "Replace logo" : "Upload logo"}
            </button>
            <p className="text-xs text-[#7A7585] mt-2">PNG / JPG / WebP — max 4MB. You&apos;ll be able to crop and resize before saving.</p>
            {logo && (
              <button
                onClick={() => {
                  // Re-open editor on the existing logo (load as File via fetch->blob)
                  fetch(logo).then((r) => r.blob()).then((b) => {
                    const f = new File([b], "logo.png", { type: b.type || "image/png" });
                    setPendingLogoFile(f);
                  }).catch(() => {});
                }}
                className="ml-3 inline-flex items-center gap-2 px-4 py-2.5 border border-[#E8E8E8] rounded-xl text-sm font-medium hover:bg-[#FDFAF5] transition-colors"
              >
                <Crop size={16} /> Edit crop
              </button>
            )}
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoFile}
            />
          </div>
        </div>
      </div>

      {pendingLogoFile && (
        <LogoCropEditor
          file={pendingLogoFile}
          onCancel={() => setPendingLogoFile(null)}
          onApply={(dataUrl) => {
            setLogo(dataUrl);
            setPendingLogoFile(null);
          }}
        />
      )}

      {/* Hero Banner */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
        <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mb-4">Hero Banner</h3>

        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
            uploading ? "border-[#C9A84C]/60 bg-[#FDFAF5]" : "border-[#E8E8E8] hover:border-[#C9A84C]/40"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={32} className="mx-auto text-[#C9A84C] mb-3 animate-spin" />
              <p className="text-sm text-[#7A7585]">Compressing image...</p>
            </>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-[#7A7585] mb-3" />
              <p className="text-sm text-[#7A7585] mb-1">Drag and drop an image, or click to browse</p>
              <p className="text-xs text-[#7A7585]">Recommended: 1920 x 720px, JPG/PNG, max 4MB</p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBannerUpload}
          />
        </div>

        {/* Banner Preview */}
        {heroBanner && (
          <div className="mt-4 relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroBanner}
              alt="Hero banner preview"
              className="h-24 rounded-xl object-cover border border-[#E8E8E8]"
            />
            <button
              onClick={removeBanner}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {!heroBanner && (
          <div className="mt-4 flex gap-3">
            <div className="w-24 h-16 rounded-lg bg-[#E8E8E8]/40 flex items-center justify-center text-[10px] text-[#7A7585]">
              <ImageIcon size={16} className="text-[#7A7585]" />
            </div>
            <p className="text-xs text-[#7A7585] self-center">No banner uploaded</p>
          </div>
        )}
      </div>

      {/* Promo Media Showcase Slider (Posters & Videos) */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E8]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#C9A84C]" />
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg">
                Promo Media Slider (Posters & Videos)
              </h3>
            </div>
            <p className="text-xs text-[#7A7585] mt-1 max-w-xl">
              Shown above &quot;Featured Products&quot; on the customer homepage. Posters automatically slide after <strong>1.5 seconds</strong>, and videos automatically slide after they <strong>completely finish playing</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs font-medium text-[#7A7585]">
              {mediaSlidesEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              onClick={() => setMediaSlidesEnabled(!mediaSlidesEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                mediaSlidesEnabled ? "bg-[#C9A84C]" : "bg-[#E8E8E8]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  mediaSlidesEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FDFAF5] border border-[#C9A84C]/20 rounded-xl p-3">
          <span className="text-xs font-medium text-[#6B5524]">
            {mediaSlides.length} slide{mediaSlides.length === 1 ? "" : "s"} configured
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addSlide('image')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8E8E8] hover:border-[#C9A84C] text-[#2A2633] text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus size={14} className="text-[#C9A84C]" /> Add Poster (Image)
            </button>
            <button
              type="button"
              onClick={() => addSlide('video')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C] hover:bg-[#8A6E2F] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Video size={14} /> Add Video
            </button>
          </div>
        </div>

        {/* Slide List */}
        {mediaSlides.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-[#E8E8E8] rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-[#FDFAF5] border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-3 text-[#C9A84C]">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-medium text-[#2A2633]">No custom media slides added yet</p>
            <p className="text-xs text-[#7A7585] mt-1 max-w-md mx-auto">
              The storefront will show default showcase luxury slides until you add your own posters or videos above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mediaSlides.map((slide, index) => (
              <div
                key={slide.id || index}
                className="border border-[#E8E8E8] rounded-xl p-4 bg-white hover:border-[#C9A84C]/40 transition-all shadow-sm space-y-4"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3 border-b border-[#F0F0F0] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#2A2633] text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        slide.type === 'video'
                          ? "bg-purple-100 text-purple-700 border border-purple-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {slide.type === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                      {slide.type === 'video' ? "Video (Plays Full Duration)" : "Poster (Slides in 1.5s)"}
                    </span>
                    <label className="flex items-center gap-1.5 text-xs text-[#7A7585] cursor-pointer ml-3">
                      <input
                        type="checkbox"
                        checked={slide.active !== false}
                        onChange={(e) => updateSlide(index, 'active', e.target.checked)}
                        className="rounded border-[#E8E8E8] text-[#C9A84C] focus:ring-[#C9A84C]"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  {/* Ordering & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveSlide(index, index - 1)}
                      className="p-1.5 text-[#7A7585] hover:text-[#2A2633] hover:bg-[#F5F5F5] rounded-lg disabled:opacity-30"
                      title="Move Up"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={index === mediaSlides.length - 1}
                      onClick={() => moveSlide(index, index + 1)}
                      className="p-1.5 text-[#7A7585] hover:text-[#2A2633] hover:bg-[#F5F5F5] rounded-lg disabled:opacity-30"
                      title="Move Down"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(index)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg ml-1"
                      title="Delete Slide"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Content body */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Preview Column */}
                  <div className="relative aspect-[16/9] bg-[#0d0d0d] rounded-lg overflow-hidden border border-[#E8E8E8] flex items-center justify-center">
                    {uploadingSlide === index ? (
                      <div className="flex flex-col items-center gap-2 text-white text-xs">
                        <Loader2 size={24} className="text-[#C9A84C] animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : slide.url ? (
                      slide.type === 'video' ? (
                        <video
                          src={slide.url}
                          muted
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slide.url}
                          alt="Slide preview"
                          className="w-full h-full object-cover"
                        />
                      )
                    ) : (
                      <div className="text-center p-3 text-white/50 text-xs flex flex-col items-center gap-1.5">
                        {slide.type === 'video' ? <Video size={24} /> : <ImageIcon size={24} />}
                        <span>No {slide.type} uploaded yet</span>
                      </div>
                    )}
                  </div>

                  {/* Form Details Column */}
                  <div className="md:col-span-2 space-y-3">
                    {/* Media Upload & URL */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#2A2633]">
                          Media File (Upload or Paste URL)
                        </label>
                        <span className="text-[10px] text-[#7A7585]">
                          {slide.type === 'video' ? 'MP4 / WebM' : 'PNG / JPG / WebP'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={slide.url}
                          onChange={(e) => updateSlide(index, 'url', e.target.value)}
                          placeholder={slide.type === 'video' ? "https://...video.mp4" : "https://...poster.jpg"}
                          className="flex-1 border border-[#E8E8E8] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        />
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-[#2A2633] text-white rounded-lg text-xs font-medium hover:bg-black transition-colors shrink-0">
                          <Upload size={13} />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept={slide.type === 'video' ? 'video/*' : 'image/*'}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleSlideFile(index, f);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-[#7A7585] block mb-1">Title (optional)</label>
                        <input
                          type="text"
                          value={slide.title || ""}
                          onChange={(e) => updateSlide(index, 'title', e.target.value)}
                          placeholder="e.g. Royal Silver Collection"
                          className="w-full border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-[#7A7585] block mb-1">Subtitle (optional)</label>
                        <input
                          type="text"
                          value={slide.subtitle || ""}
                          onChange={(e) => updateSlide(index, 'subtitle', e.target.value)}
                          placeholder="e.g. 925 Sterling Silver"
                          className="w-full border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                        />
                      </div>
                    </div>

                    {/* Destination Link */}
                    <div>
                      <label className="text-xs text-[#7A7585] block mb-1">Click Destination URL (optional)</label>
                      <input
                        type="text"
                        value={slide.link || ""}
                        onChange={(e) => updateSlide(index, 'link', e.target.value)}
                        placeholder="e.g. /category/rings or /custom-jewelry"
                        className="w-full border border-[#E8E8E8] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcement */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg">Announcement Bar</h3>
          <button
            onClick={() => setAnnouncementEnabled(!announcementEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              announcementEnabled ? "bg-[#C9A84C]" : "bg-[#E8E8E8]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                announcementEnabled ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <input
          type="text"
          value={announcement}
          onChange={(e) => setAnnouncement(e.target.value)}
          placeholder="Enter announcement text..."
          className="w-full border border-[#E8E8E8] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
        />
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
        <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mb-4">Social Links</h3>
        <div className="space-y-4">
          {[
            { key: "instagram" as const, label: "Instagram", icon: <Globe size={18} /> },
            { key: "facebook" as const, label: "Facebook", icon: <Mail size={18} /> },
            { key: "twitter" as const, label: "Twitter / X", icon: <MessageCircle size={18} /> },
            { key: "website" as const, label: "Website", icon: <Globe size={18} /> },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#FDFAF5] flex items-center justify-center text-[#7A7585] shrink-0">
                {s.icon}
              </span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#7A7585] mb-1">{s.label}</label>
                <input
                  type="url"
                  value={socials[s.key]}
                  onChange={(e) => setSocials((p) => ({ ...p, [s.key]: e.target.value }))}
                  placeholder={`https://${s.key}.com/yourpage`}
                  className="w-full border border-[#E8E8E8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-8 py-3 bg-[#C9A84C] text-white font-medium rounded-xl hover:bg-[#8A6E2F] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && <span className="text-sm text-green-700 font-medium">Settings saved!</span>}
      </div>
    </div>
  );
}
