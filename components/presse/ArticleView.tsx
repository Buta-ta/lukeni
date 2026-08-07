"use client";

import { useEffect, useState } from "react";
import { UnifiedItem } from "@/components/presse/types";

export default function ArticleView({
  article,
  lang,
  onClose,
}: {
  article: UnifiedItem;
  lang: "fr" | "en";
  onClose: () => void;
}) {
  const [html, setHtml] = useState("");
  const title = lang === "fr" ? article.title_fr : article.title_en;
  const content = lang === "fr" ? article.content_fr : article.content_en;
  const summary = lang === "fr" ? article.summary_fr : article.summary_en;

  const fontSizeMap: Record<string, string> = {
    small: "15px",
    normal: "17px",
    large: "19px",
    xlarge: "21px",
  };

  useEffect(() => {
    if (!article.font_family) return;
    const fontName = article.font_family.replace(/\s+/g, "+");
    const linkId = `google-font-${fontName}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, [article.font_family]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { renderMarkdownToHtml } = await import("@/lib/markdown");
      const rendered = await renderMarkdownToHtml(content || "");
      if (mounted) setHtml(rendered);
    })();
    return () => {
      mounted = false;
    };
  }, [content]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 py-6">
        <button onClick={onClose} className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-900 mb-6">
          <span className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center">←</span>
          {lang === "fr" ? "Retour" : "Back"}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
          {/* Main column */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase mb-3">
              <span className="w-2 h-2 rounded-full" style={{ background: article.category_color }} />
              <span style={{ color: article.category_color }}>{lang === "fr" ? article.category_name_fr : article.category_name_en}</span>
              <span className="text-zinc-300">•</span>
              <span className="text-zinc-500 font-normal normal-case tracking-normal">
                {new Date(article.date).toLocaleDateString(lang === "fr" ? "fr-FR" : "en-US", { day: "numeric", month: "long", year: "numeric" })} • {article.reading_time_minutes || 4} min
              </span>
            </div>

            <h1
              className="font-serif font-black text-zinc-900 leading-tight"
              style={{
                fontFamily: article.font_family ? `'${article.font_family}', serif` : "'Inter', sans-serif",
                fontSize: "34px",
              }}
            >
              {title}
            </h1>

            {summary && <p className="text-[18px] leading-7 text-zinc-600 mt-4 border-l-4 pl-4" style={{ borderColor: article.category_color }}>{summary}</p>}

            <div className="flex items-center gap-3 mt-6 pb-6 border-b border-zinc-200">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-600">
                {article.author_or_source?.[0]?.toUpperCase() || "L"}
              </div>
              <div>
                <div className="text-sm font-bold text-zinc-900">{article.author_or_source}</div>
                <div className="text-xs text-zinc-500">{lang === "fr" ? "Rédaction Lukeni" : "Lukeni Editorial"}</div>
              </div>
            </div>

            {article.cover_url && (
              <div className="mt-8 rounded-2xl overflow-hidden bg-zinc-100">
                <img src={article.cover_url} alt={title} className="w-full h-auto object-cover" />
                {article.location_city && (
                  <div className="px-4 py-2 bg-zinc-50 text-xs text-zinc-500 flex items-center gap-1.5">
                    <span>📍</span> {article.location_city} {article.location_country ? `• ${article.location_country}` : ""}
                  </div>
                )}
              </div>
            )}

            <div
              className="press-article-body mt-8 max-w-none"
              style={{
                fontFamily: article.font_family ? `'${article.font_family}', serif` : "'Inter', sans-serif",
                fontSize: fontSizeMap[article.font_size || "normal"],
                color: "#18181b",
                lineHeight: "1.8",
              }}
            >
              <style>{`
                .press-article-body p { margin-bottom: 1.25em; }
                .press-article-body h2 { font-size: 1.8em; font-weight: 800; margin: 2em 0 0.7em; line-height: 1.2; }
                .press-article-body h3 { font-size: 1.4em; font-weight: 700; margin: 1.6em 0 0.6em; }
                .press-article-body a { color: #1B3A2D; text-decoration: underline; text-underline-offset: 3px; }
                .press-article-body blockquote { border-left: 4px solid #D4AF37; padding-left: 1em; font-style: italic; color: #52525b; margin: 1.5em 0; }
                .press-article-body ul, .press-article-body ol { margin: 1.2em 0 1.2em 1.5em; }
                .press-article-body li { margin: 0.4em 0; }
                .press-article-body table { width: 100%; border-collapse: collapse; margin: 1.5em 0; font-size: 0.9em; }
                .press-article-body th { background: #f4f4f5; text-align: left; padding: 10px 12px; border: 1px solid #e4e4e7; }
                .press-article-body td { padding: 10px 12px; border: 1px solid #e4e4e7; }
                .press-article-body code { background: #f4f4f5; padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
                .press-article-body pre { background: #18181b; color: #e4e4e7; padding: 16px; border-radius: 12px; overflow-x: auto; margin: 1.5em 0; }
                .press-article-body pre code { background: transparent; color: inherit; padding: 0; }
              `}</style>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>

            {/* Media items */}
            {article.media_items && article.media_items.length > 0 && (
              <div className="mt-10 space-y-6">
                {article.media_items.map((m: any, i: number) => (
                  <div key={i} className="rounded-2xl overflow-hidden border border-zinc-200 bg-white">
                    {m.type === "image" && m.url && <img src={m.url} alt={m.alt || ""} className="w-full h-auto" />}
                    {m.type === "youtube" && m.youtube_id && (
                      <div className="aspect-video">
                        <iframe src={`https://www.youtube.com/embed/${m.youtube_id}`} className="w-full h-full" allowFullScreen />
                      </div>
                    )}
                    {m.type === "quote_hero" && (
                      <div className="p-8 bg-zinc-50 text-center">
                        <div className="text-4xl text-[#D4AF37] mb-3">“</div>
                        <div className="font-serif text-xl leading-relaxed text-zinc-900">{m.quote_text}</div>
                        {m.quote_author && <div className="text-sm text-zinc-500 mt-2">— {m.quote_author}</div>}
                      </div>
                    )}
                    {m.caption && <div className="px-4 py-2 text-xs text-zinc-500 bg-zinc-50 border-t border-zinc-100">{m.caption}</div>}
                  </div>
                ))}
              </div>
            )}

            {article.sources && article.sources.length > 0 && (
              <div className="mt-10 p-5 bg-zinc-50 rounded-2xl border border-zinc-200">
                <div className="text-xs font-bold tracking-widest uppercase text-zinc-500 mb-3">Sources</div>
                <ul className="space-y-2">
                  {article.sources.map((s: any, i: number) => (
                    <li key={i} className="text-sm">
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[#1B3A2D] hover:underline font-medium">
                        {s.title}
                      </a>
                      {s.author && <span className="text-zinc-500"> — {s.author}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar - Digest like Numerama Explorer */}
          <aside className="hidden lg:block">
            <div className="sticky top-[84px] space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-[#FFFBF0] p-5">
                <div className="text-xs font-black tracking-widest uppercase text-zinc-900 mb-3">Explorer</div>
                <div className="text-sm text-zinc-600 mb-3">Découvrez nos autres contenus</div>
                <div className="h-px bg-zinc-200 mb-3" />
                <div className="text-xs text-zinc-500">Catégorie : {lang === "fr" ? article.category_name_fr : article.category_name_en}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
