"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Menu, Moon, Search, SlidersHorizontal, Sun, X } from "lucide-react";
import { allBrands, perfumes, type Perfume } from "@/data/perfumes";
import { contactConfig } from "@/config/contact";
import { getPerfumeImage } from "@/lib/perfume-media";

const uiCategories = ["Tout voir", "Nouveautés", "Grands classiques", "Niche", "Collections Privées"] as const;

type UiCategory = (typeof uiCategories)[number];

const normalizeText = (text: string | undefined | null) =>
  text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

const getCategoryMatcher = (selectedCategory: UiCategory) => {
  if (selectedCategory === "Tout voir") {
    return () => true;
  }
  if (selectedCategory === "Nouveautés") {
    return (perfume: Perfume) =>
      perfume.tags?.some((tag) => normalizeText(tag).includes("nouveau")) ?? false;
  }
  if (selectedCategory === "Grands classiques") {
    return (perfume: Perfume) => perfume.category === "Grands classiques";
  }
  if (selectedCategory === "Niche") {
    return (perfume: Perfume) => perfume.category === "Niche";
  }
  if (selectedCategory === "Collections Privées") {
    return (perfume: Perfume) =>
      perfume.tags?.some((tag) => normalizeText(tag).includes("collection")) ?? false;
  }
  return () => true;
};

// Construit la liste des marques pour l'overlay (première entrée = Toutes)
const uiBrands = ["Toutes", ...allBrands.filter((brand) => brand !== "Tous")];

export const HomeClient = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<UiCategory>("Tout voir");
  const [selectedBrand, setSelectedBrand] = useState<string>("Toutes");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredPerfumes = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm);
    const matchCategory = getCategoryMatcher(selectedCategory);

    return perfumes.filter((perfume) => {
      const matchSearch =
        !normalizedSearch ||
        normalizeText(perfume.name).includes(normalizedSearch) ||
        normalizeText(perfume.brand).includes(normalizedSearch);

      const matchBrand = selectedBrand === "Toutes" || perfume.brand === selectedBrand;

      return matchSearch && matchCategory(perfume) && matchBrand;
    });
  }, [searchTerm, selectedCategory, selectedBrand]);

  const theme = isDarkMode
    ? {
        bg: "bg-[#0A0A0A]",
        text: "text-[#FDFCF8]",
        textInvert: "text-[#0A0A0A]",
        bgInvert: "bg-[#FDFCF8]",
        accent: "text-[#C29B62]",
        accentHover: "hover:text-[#C29B62]",
        border: "border-[#FDFCF8]/10",
        borderSolid: "border-[#FDFCF8]",
        borderFocus: "focus:border-[#C29B62]",
        surface: "bg-[#141414]",
        navBg: "bg-[#0A0A0A]/95",
        heroGradient: "from-[#0A0A0A]/80 via-[#0A0A0A]/40 to-[#0A0A0A]",
        overlayBg: "bg-[#0A0A0A]/90",
        muted: "text-[#A0A0A0]",
        mutedHover: "hover:text-[#FDFCF8]",
        btnHoverBg: "hover:bg-[#C29B62]",
        selection: "selection:bg-[#FDFCF8] selection:text-[#0A0A0A]",
        afterBg: "after:bg-[#FDFCF8]",
        placeholder: "placeholder:text-[#FDFCF8]/20",
        iconMuted: "text-[#FDFCF8]/50",
      }
    : {
        bg: "bg-[#FDFCF8]",
        text: "text-[#111111]",
        textInvert: "text-[#FDFCF8]",
        bgInvert: "bg-[#111111]",
        accent: "text-[#8C7A6B]",
        accentHover: "hover:text-[#8C7A6B]",
        border: "border-[#111111]/10",
        borderSolid: "border-[#111111]",
        borderFocus: "focus:border-[#8C7A6B]",
        surface: "bg-[#F5F4F0]",
        navBg: "bg-[#FDFCF8]/95",
        heroGradient: "from-[#FDFCF8]/80 via-[#FDFCF8]/40 to-[#FDFCF8]",
        overlayBg: "bg-[#FDFCF8]/90",
        muted: "text-[#888888]",
        mutedHover: "hover:text-[#111111]",
        btnHoverBg: "hover:bg-[#8C7A6B]",
        selection: "selection:bg-[#111111] selection:text-[#FDFCF8]",
        afterBg: "after:bg-[#111111]",
        placeholder: "placeholder:text-[#111111]/20",
        iconMuted: "text-[#111111]/50",
      };

  return (
    <div
      className={`min-h-screen ${theme.bg} ${theme.text} ${theme.selection} font-sans overflow-x-hidden transition-colors duration-700`}
    >

      {/* NAVBAR */}
      <nav
        className={`fixed top-0 w-full z-40 transition-all duration-500 ${
          scrolled ? `${theme.navBg} backdrop-blur-md py-4 shadow-sm` : "bg-transparent py-6"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-12">
          <button className="md:hidden" aria-label="Ouvrir le menu">
            <Menu size={24} className={theme.text} />
          </button>

          <div className="font-serif text-2xl font-semibold uppercase tracking-widest text-center md:static md:translate-x-0 absolute left-1/2 -translate-x-1/2">
            Nurea
          </div>

          <div className="hidden items-center gap-10 text-xs uppercase tracking-[0.2em] md:flex">
            <a
              href="#collection"
              className={`${theme.accentHover} relative transition-colors after:absolute after:left-0 after:-bottom-2 after:h-[1px] after:w-full ${theme.afterBg} after:scale-x-0 after:transition-transform after:duration-300 hover:after:scale-x-100`}
            >
              La Collection
            </a>
            <a href="#" className={`${theme.accentHover} transition-colors`}>
              Maisons
            </a>
            <a href="#" className={`${theme.accentHover} transition-colors`}>
              Héritage
            </a>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDarkMode((value) => !value)}
              className={`hidden h-8 w-8 items-center justify-center rounded-full border border-transparent transition-all hover:${theme.borderSolid} md:flex`}
              aria-label="Basculer le thème"
            >
              {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="flex items-center gap-2 md:hidden"
              aria-label="Ouvrir la recherche"
            >
              <Search size={20} />
            </button>
            <div className="hidden items-center gap-6 md:flex">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className={`flex items-center gap-2 text-xs uppercase tracking-[0.1em] ${theme.text} ${theme.accentHover} transition-colors`}
              >
                <Search size={14} /> Recherche
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative flex min-h-[90vh] items-center justify-center px-6 pt-20 md:min-h-screen">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply">
          <img
            src="https://images.unsplash.com/photo-1616604847463-b676fb7ddba7?auto=format&fit=crop&q=80&w=2000"
            alt="Texture de fond"
            className={`h-full w-full object-cover grayscale ${isDarkMode ? "opacity-30" : ""}`}
          />
          <div className={`absolute inset-0 bg-gradient-to-b ${theme.heroGradient}`} />
        </div>

        <div className="relative z-10 mt-12 flex max-w-4xl flex-col items-center text-center md:mt-0">
          <span
            className={`${theme.accent} mb-6 block text-xs uppercase tracking-[0.4em] md:text-sm animate-[fadeInUp_1s_ease-out]`}
          >
            Maison de Haute Parfumerie
          </span>
          <h1
            className={`font-serif text-5xl font-light leading-[1.1] md:text-7xl lg:text-8xl ${theme.text} mb-8 animate-[fadeInUp_1.2s_ease-out]`}
          >
            L'Élégance de <br className="hidden md:block" />
            <span className={`italic ${theme.accent}`}>l'Invisible.</span>
          </h1>
          <p
            className={`${theme.muted} mb-12 max-w-md text-sm font-light leading-relaxed md:text-base animate-[fadeInUp_1.4s_ease-out]`}
          >
            Explorez notre sélection privée. Des fragrances iconiques aux créations de niche les plus confidentielles,
            trouvez votre signature olfactive.
          </p>
          <a
            href="#collection"
            className={`group flex h-16 w-16 items-center justify-center rounded-full border ${theme.borderSolid} ${theme.bgInvert} ${theme.textInvert} transition-all duration-500 hover:scale-[1.03] animate-[fadeInUp_1.6s_ease-out]`}
            aria-label="Descendre vers la collection"
          >
            <ArrowRight
              size={20}
              className="transition-transform duration-500 group-hover:translate-y-1 group-hover:rotate-90"
            />
          </a>
        </div>
      </header>

      {/* CATALOGUE */}
      <main id="collection" className="mx-auto max-w-[1400px] px-6 py-24 md:px-12">
        {/* FILTRES */}
        <div
          className={`mb-16 flex flex-col gap-8 border-b pb-8 md:flex-row md:items-end md:justify-between ${theme.border}`}
        >
          <div className="w-full flex-1 md:w-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-serif text-3xl md:text-4xl">La Collection</h2>
              <button
                type="button"
                onClick={() => setIsDarkMode((value) => !value)}
                className={`md:hidden flex items-center justify-center rounded-full border border-transparent p-2 transition-all hover:${theme.borderSolid}`}
                aria-label="Basculer le thème"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>

            <div className="no-scrollbar flex gap-8 overflow-x-auto pb-2 md:gap-12">
              {uiCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative shrink-0 text-sm tracking-wide transition-all duration-300 ${
                    selectedCategory === cat ? `${theme.text} font-medium` : `${theme.muted} hover:${theme.text}`
                  }`}
                >
                  {cat}
                  {selectedCategory === cat && (
                    <span className={`absolute -bottom-2 left-0 h-[1px] w-full ${theme.bgInvert}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={`flex shrink-0 items-center gap-3 text-xs uppercase tracking-widest ${theme.text} ${theme.accentHover} transition-colors`}
          >
            <SlidersHorizontal size={16} strokeWidth={1.5} />
            Affiner
          </button>
        </div>

        {/* GRILLE */}
        {filteredPerfumes.length === 0 ? (
          <div className={`py-32 text-center font-serif text-2xl ${theme.muted}`}>
            Aucune création ne correspond à votre recherche.
          </div>
        ) : (
          <div className="grid animate-stagger grid-cols-1 gap-x-8 gap-y-20 md:grid-cols-2 lg:grid-cols-3">
            {filteredPerfumes.map((perfume) => {
              const image = getPerfumeImage(perfume.id);

              return (
                <div
                  key={perfume.id}
                  className="group flex cursor-pointer flex-col"
                  onClick={() => setActiveItem((current) => (current === perfume.id ? null : perfume.id))}
                  onMouseLeave={() => setActiveItem(null)}
                >
                  <div className={`relative mb-6 aspect-[3/4] overflow-hidden ${theme.surface}`}>
                    {perfume.tags && (
                      <div className="absolute left-4 top-4 z-20">
                        {perfume.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`text-[10px] font-medium uppercase tracking-[0.2em] ${theme.text}`}
                          >
                            • {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {image ? (
                      <img
                        src={image}
                        alt={`${perfume.name} - ${perfume.brand}`}
                        className="h-full w-full object-cover opacity-90 mix-blend-multiply transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105 group-hover:opacity-100"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/5">
                        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Visuel à venir</p>
                      </div>
                    )}

                    <div
                      className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-8 ${theme.overlayBg} backdrop-blur-sm transition-all duration-500 ease-out ${
                        activeItem === perfume.id
                          ? "translate-y-0 opacity-100"
                          : "translate-y-4 opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
                      }`}
                    >
                      <p className="mb-4 text-center font-serif text-xl">Acquérir cette création</p>
                      <a
                        href={contactConfig.whatsapp.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex w-full items-center justify-between px-6 py-4 text-xs uppercase tracking-[0.15em] ${theme.bgInvert} ${theme.textInvert} ${theme.btnHoverBg} transition-colors`}
                      >
                        Via WhatsApp <ArrowRight size={14} />
                      </a>
                      <a
                        href={contactConfig.snapchat.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex w-full items-center justify-between border px-6 py-4 text-xs uppercase tracking-[0.15em] ${theme.text} ${theme.borderSolid} hover:${theme.surface} transition-colors`}
                      >
                        Via Snapchat <ArrowRight size={14} />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col text-center">
                    <p
                      className={`mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] ${
                        theme.accent
                      }`}
                    >
                      {perfume.brand}
                    </p>
                    <h3 className={`mb-2 font-serif text-2xl md:text-3xl ${theme.text}`}>{perfume.name}</h3>
                    <p className={`mt-auto text-xs uppercase tracking-widest ${theme.muted}`}>
                      Disponible sur demande
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* OVERLAY FILTRES & RECHERCHE */}
      <div
        className={`fixed inset-0 z-50 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] ${theme.bg} ${
          isFilterOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className={`flex items-center justify-between border-b p-6 md:p-12 ${theme.border}`}>
          <span className="font-serif text-2xl font-semibold uppercase tracking-widest">Recherche</span>
          <button
            type="button"
            onClick={() => setIsFilterOpen(false)}
            className="flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-black/5"
            aria-label="Fermer"
          >
            <X size={24} strokeWidth={1} />
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto p-6 md:p-12">
          <div className="relative mb-16">
            <input
              type="text"
              placeholder="Que recherchez-vous ?"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`w-full bg-transparent py-4 text-2xl font-serif ${theme.text} ${theme.placeholder} border-b ${theme.borderSolid} md:py-8 md:text-4xl focus:outline-none ${theme.borderFocus} transition-colors`}
            />
            <Search
              size={24}
              strokeWidth={1}
              className={`absolute right-0 top-1/2 -translate-y-1/2 ${theme.iconMuted}`}
            />
          </div>

          <div className="grid gap-16 md:grid-cols-2">
            <div>
              <h4
                className={`mb-8 text-xs font-semibold uppercase tracking-[0.2em] ${
                  theme.accent
                }`}
              >
                Maisons de Parfum
              </h4>
              <ul className="space-y-4">
                {uiBrands.map((brand) => (
                  <li key={brand}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand(brand);
                        setIsFilterOpen(false);
                      }}
                      className={`font-serif text-lg transition-colors md:text-xl ${
                        selectedBrand === brand
                          ? `${theme.text} italic`
                          : `${theme.muted} ${theme.mutedHover}`
                      }`}
                    >
                      {brand}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4
                className={`mb-8 text-xs font-semibold uppercase tracking-[0.2em] ${
                  theme.accent
                }`}
              >
                Familles & Collections
              </h4>
              <ul className="space-y-4">
                {uiCategories.map((cat) => (
                  <li key={cat}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsFilterOpen(false);
                      }}
                      className={`font-serif text-lg transition-colors md:text-xl ${
                        selectedCategory === cat
                          ? `${theme.text} italic`
                          : `${theme.muted} ${theme.mutedHover}`
                      }`}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className={`flex justify-center border-t p-6 md:p-12 ${theme.border}`}>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("Tout voir");
              setSelectedBrand("Toutes");
            }}
            className={`underline-offset-8 text-xs uppercase tracking-[0.2em] underline ${theme.muted} ${theme.mutedHover} transition-colors`}
          >
            Réinitialiser les critères
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-20 bg-[#0A0A0A] pt-24 pb-12 text-[#FDFCF8]">
        <div className="mx-auto max-w-[1400px] px-6 md:px-12">
          <div className="mb-20 grid gap-12 text-center md:grid-cols-3 md:gap-8 md:text-left">
            <div>
              <div className="mb-6 font-serif text-3xl uppercase tracking-widest">Nurea</div>
              <p className="mx-auto max-w-xs text-sm font-light text-[#888888] md:mx-0">
                La quintessence de la parfumerie mondiale, sélectionnée avec soin pour les amateurs d&apos;exception.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#555555]">
                Conseil &amp; Commande
              </span>
              <a
                href={contactConfig.whatsapp.url}
                target="_blank"
                rel="noreferrer"
                className="font-serif text-xl transition-colors hover:text-[#C29B62]"
              >
                WhatsApp
              </a>
              <a
                href={contactConfig.snapchat.url}
                target="_blank"
                rel="noreferrer"
                className="font-serif text-xl transition-colors hover:text-[#C29B62]"
              >
                Snapchat
              </a>
            </div>
            <div className="flex flex-col gap-4 md:items-end">
              <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#555555]">
                Informations
              </span>
              <a href="#" className="text-sm transition-colors hover:text-[#C29B62]">
                Conditions Générales
              </a>
              <a href="#" className="text-sm transition-colors hover:text-[#C29B62]">
                Mentions Légales
              </a>
            </div>
          </div>

          <div className="border-t border-[#FDFCF8]/10 pt-8 text-center text-xs uppercase tracking-widest text-[#555555]">
            © {new Date().getFullYear()} Nurea Parfums. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

