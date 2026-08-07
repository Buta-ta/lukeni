"use client";

import { UnifiedItem } from "@/components/presse/types";

export function ArticleCard({
  article,
  lang,
  variant = "standard",
  onClick,
}: {
  article: UnifiedItem;
  lang: "fr" | "en";
  variant?: "hero" | "featured" | "standard" | "compact" | "list";
  onClick: () => void;
}) {
  const title = lang === "fr" ? article.title_fr : article.title_en;
  const summary = lang === "fr" ? article.summary_fr : article.summary_en;
  const category = lang === "fr" ? article.category_name_fr : article.category_name_en;

  if (variant === "hero") {
    return (
      <article onClick={onClick} className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-zinc-300 transition">
        <div className="aspect-[16/9] overflow-hidden bg-zinc-100">
          {article.cover_url ? (
            <img src={article.cover_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-100 to-zinc-200" />
          )}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full" style={{ background: article.category_color }} />
            <span style={{ color: article.category_color }}>{category}</span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-500 font-normal normal-case tracking-normal">{article.reading_time_minutes || 4} min</span>
            {article.is_breaking && <span className="ml-2 bg-red-600 text-white px-2 py-0.5 rounded-full">Breaking</span>}
          </div>
          <h2 className="font-serif font-black text-[26px] leading-tight text-zinc-900 mt-3 group-hover:text-[#1B3A2D] transition line-clamp-3">{title}</h2>
          <p className="text-[15px] leading-6 text-zinc-600 mt-3 line-clamp-2">{summary}</p>
          <div className="flex items-center gap-2 mt-4 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-700">{article.author_or_source}</span>
            <span>•</span>
            <span>{new Date(article.date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article onClick={onClick} className="group cursor-pointer flex gap-4 py-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 -mx-2 px-2 rounded-xl transition">
        <div className="w-[96px] h-[72px] rounded-xl overflow-hidden bg-zinc-100 shrink-0">
          {article.cover_url && <img src={article.cover_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.03] transition" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: article.category_color }}>{category}</div>
          <h3 className="font-serif font-bold text-[15px] leading-tight text-zinc-900 line-clamp-2 group-hover:text-[#1B3A2D]">{title}</h3>
          <div className="text-xs text-zinc-500 mt-1">{article.reading_time_minutes || 3} min • {new Date(article.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</div>
        </div>
      </article>
    );
  }

  if (variant === "list") {
    return (
      <article onClick={onClick} className="group cursor-pointer flex gap-5 p-4 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition">
        <div className="w-[200px] h-[130px] rounded-xl overflow-hidden bg-zinc-100 shrink-0 hidden md:block">
          {article.cover_url && <img src={article.cover_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.02] transition" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold tracking-widest uppercase" style={{ color: article.category_color }}>{category}</div>
          <h3 className="font-serif font-black text-[18px] leading-tight text-zinc-900 mt-1 line-clamp-2 group-hover:text-[#1B3A2D]">{title}</h3>
          <p className="text-sm text-zinc-600 mt-2 line-clamp-2 hidden md:line-clamp-2">{summary}</p>
          <div className="text-xs text-zinc-500 mt-2">{article.author_or_source} • {new Date(article.date).toLocaleDateString("fr-FR")}</div>
        </div>
      </article>
    );
  }

  // standard / featured
  const isFeatured = variant === "featured";
  return (
    <article onClick={onClick} className={`group cursor-pointer bg-white rounded-2xl overflow-hidden border border-zinc-200 hover:border-zinc-300 transition ${isFeatured ? "md:col-span-2" : ""}`}>
      <div className={`${isFeatured ? "aspect-[16/8]" : "aspect-[16/9]"} overflow-hidden bg-zinc-100`}>
        {article.cover_url && <img src={article.cover_url} alt={title} className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500" />}
      </div>
      <div className="p-5">
        <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: article.category_color }}>{category}</div>
        <h3 className={`font-serif font-bold text-zinc-900 mt-2 line-clamp-2 group-hover:text-[#1B3A2D] ${isFeatured ? "text-[20px] leading-tight" : "text-[16px] leading-snug"}`}>{title}</h3>
        <p className="text-[13px] leading-5 text-zinc-600 mt-2 line-clamp-2">{summary}</p>
        <div className="text-xs text-zinc-500 mt-3">{article.reading_time_minutes || 4} min</div>
      </div>
    </article>
  );
}
