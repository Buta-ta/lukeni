"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Lang = "fr" | "en";

type LanguageContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = localStorage.getItem("lukeni_lang") as Lang | null;
    if (stored === "fr" || stored === "en") {
      setLangState(stored);
    }
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("lukeni_lang", newLang);

    // Compatibilité : on notifie aussi les composants qui écoutent encore un event custom
    window.dispatchEvent(
      new CustomEvent("languageChange", { detail: { lang: newLang } })
    );
  };

  const toggleLang = () => {
    setLang(lang === "fr" ? "en" : "fr");
  };

  const value = useMemo(
    () => ({ lang, setLang, toggleLang }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}