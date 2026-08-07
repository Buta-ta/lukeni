"use client";

import Link from "next/link";

interface Category {
  id: string;
  name_fr: string;
  name_en: string;
  color?: string;
}

const CaurisIcon = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className="text-[#D4AF37]" fill="currentColor">
    <path fill="currentColor" d="M50 5C30 5 15 25 15 50C15 75 30 95 50 95C70 95 85 75 85 50C85 25 70 5 50 5ZM50 85C35 85 25 70 25 50C25 30 35 15 50 15C65 15 75 30 75 50C75 70 65 85 50 85Z" opacity={0.9} />
    <path d="M50 25C48 25 46 40 46 50C46 60 48 75 50 75C52 75 54 60 54 50C54 40 52 25 50 25Z" fill="#D4AF37" />
  </svg>
);

export default function PressHeader({
  categories,
  activeCategory,
  setActiveCategory,
  lang,
  onSearch,
}: {
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (id: string) => void;
  lang: "fr" | "en";
  onSearch: (v: string) => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
      {/* Top thin bar */}
      <div className="hidden md:flex items-center justify-between px-6 py-2 bg-[#FFFBF0] border-b border-zinc-100 text-[11px] text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="hidden lg:inline">Peuple • Mémoire • Mission</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {lang === "fr" ? "Édition du jour" : "Today's edition"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-zinc-400">
          <a href="https://www.youtube.com/@lukeni" target="_blank" className="hover:text-zinc-700">YouTube</a>
          <span className="opacity-20">•</span>
          <a href="#" className="hover:text-zinc-700">Newsletter</a>
        </div>
      </div>

      {/* Main bar */}
      <div className="px-4 md:px-6 py-4 flex items-center justify-between gap-6 max-w-[1280px] mx-auto">
        <Link href="/presse" className="flex items-center gap-3 shrink-0">
          <CaurisIcon size={36} />
          <div>
            <div className="font-serif font-black tracking-[0.25em] text-[18px] leading-none text-zinc-900">LUKENI</div>
            <div className="text-[9px] tracking-[0.35em] text-[#D4AF37] font-bold -mt-0.5">LE CONTINENT</div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1 text-[12px] font-semibold tracking-wide">
          <button
            onClick={() => setActiveCategory("")}
            className={`px-3 py-1.5 rounded-full transition ${activeCategory === "" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
          >
            {lang === "fr" ? "Tout" : "All"}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-full transition flex items-center gap-1.5 ${activeCategory === c.id ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: c.color || "#D4AF37" }} />
              {lang === "fr" ? c.name_fr : c.name_en}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input
              onChange={(e) => onSearch(e.target.value)}
              placeholder={lang === "fr" ? "Rechercher..." : "Search..."}
              className="bg-transparent outline-none text-sm placeholder:text-zinc-400 w-28 lg:w-36"
            />
          </div>
          <Link href="/auth" className="hidden md:inline-flex text-xs font-bold bg-[#D4AF37] text-white px-4 py-2 rounded-full hover:bg-[#c19a2e] transition">
            S&apos;abonner
          </Link>
        </div>
      </div>

      {/* Mobile categories */}
      <div className="lg:hidden px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
        <button onClick={() => setActiveCategory("")} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${activeCategory === "" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200"}`}>Tout</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${activeCategory === c.id ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200"}`}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color || "#D4AF37" }} />{lang === "fr" ? c.name_fr : c.name_en}
          </button>
        ))}
      </div>
    </header>
  );
}
