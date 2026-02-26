"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import { useAppSettings } from "@/context/AppSettingsContext";

export type RouteResult = {
  code: string;
  name: string;
  description: string;
  origen: string;
  destino: string;
  tipo_ruta: string;
  tipo_unidad: string;
  recorrido: string;
  tarifa: string;
  tarifa_excedente: string;
  kilometros: string;
  codigo_rut: string;
  h_inicio_lv: string;
  h_fin_lv: string;
  h_inicio_sd: string;
  h_fin_sd: string;
  comentario: string;
  municipio: string;
};

type SearchBarProps = {
  onRouteSelect: (route: RouteResult) => void;
  autoFocus?: boolean;
  onClose?: () => void;
};

export function SearchBar({ onRouteSelect, autoFocus, onClose }: SearchBarProps) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<RouteResult[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setIsOpen]   = useState(false);
  const debounceRef            = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef           = useRef<HTMLDivElement>(null);
  const inputRef               = useRef<HTMLInputElement>(null);
  const justSelected           = useRef(false);
  const { resolvedTheme }      = useAppSettings();
  const isDark                 = resolvedTheme === "dark";

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 80);
  }, [autoFocus]);

  useEffect(() => {
    const onClickOut = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false); onClose?.();
      }
    };
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, [onClose]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (justSelected.current) { justSelected.current = false; return; }
    if (query.trim().length < 2) { setResults([]); setIsOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (route: RouteResult) => {
    justSelected.current = true;
    setQuery(""); setIsOpen(false); setResults([]);
    onRouteSelect(route);
  };

  const handleClear = () => {
    justSelected.current = false;
    setQuery(""); setResults([]); setIsOpen(false);
    onClose?.();
  };

  // ── Tokens ─────────────────────────────────────────────────
  const bg     = isDark ? "rgba(15,23,42,0.92)"      : "rgba(255,255,255,0.95)";
  const border = isDark ? "rgba(255,255,255,0.12)"   : "rgba(0,0,0,0.12)";
  const text   = isDark ? "#f1f5f9"                  : "#0f172a";
  const sub    = isDark ? "#64748b"                  : "#94a3b8";
  const dropBg = isDark ? "rgba(15,23,42,0.97)"      : "#ffffff";

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.6rem",
        background: bg, border: `1px solid ${border}`,
        borderRadius: "2rem", padding: "0.7rem 1rem",
        backdropFilter: "blur(20px)", boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
      }}>
        <Search size={17} style={{ color: "#0284c7", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text" value={query} autoComplete="off"
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="¿A dónde vas?"
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: text, fontSize: "0.92rem", minWidth: 0 }}
        />
        {isLoading && <Loader2 size={16} style={{ color: "#0284c7", flexShrink: 0, animation: "sbspin 0.7s linear infinite" }} />}
        <button onClick={handleClear}
          style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", color: sub, width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <X size={13} />
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 9999,
          background: dropBg, border: `1px solid ${border}`,
          borderRadius: "1rem", overflow: "hidden",
          backdropFilter: "blur(24px)", boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}>
          <p style={{ fontSize: "0.68rem", color: sub, padding: "0.6rem 1rem 0.25rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {results.length} resultado(s)
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 310, overflowY: "auto" }}>
            {results.map(route => (
              <li key={route.code}>
                <button
                  onClick={() => handleSelect(route)}
                  style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.3rem", padding: "0.7rem 1rem", background: "transparent", border: "none", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? "rgba(2,132,199,0.08)" : "rgba(2,132,199,0.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      fontFamily: "monospace", fontSize: "0.72rem", fontWeight: 700,
                      padding: "2px 6px", borderRadius: "0.3rem",
                      background: "rgba(234,88,12,0.1)", color: "#ea580c",
                      border: "1px solid rgba(234,88,12,0.2)", whiteSpace: "nowrap",
                    }}>{route.code}</span>
                    <span style={{ color: text, fontSize: "0.88rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      {route.origen} <ArrowRight size={12} style={{ color: sub, flexShrink: 0 }} /> {route.destino}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                    {[route.tipo_ruta, route.tipo_unidad].filter(Boolean).map(tag => (
                      <span key={tag} style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: sub, fontSize: "0.68rem", padding: "2px 6px", borderRadius: "0.3rem" }}>{tag}</span>
                    ))}
                    {route.tarifa && parseFloat(route.tarifa) > 0 && (
                      <span style={{ background: "rgba(22,163,74,0.08)", color: "#16a34a", fontSize: "0.68rem", padding: "2px 6px", borderRadius: "0.3rem" }}>
                        ${parseFloat(route.tarifa).toFixed(2)}
                      </span>
                    )}
                    {route.kilometros && (
                      <span style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: sub, fontSize: "0.68rem", padding: "2px 6px", borderRadius: "0.3rem" }}>
                        {parseFloat(route.kilometros).toFixed(1)} km
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 9999, background: dropBg, border: `1px solid ${border}`, borderRadius: "1rem", padding: "1.25rem", textAlign: "center", color: sub, fontSize: "0.85rem" }}>
          No se encontraron rutas para "{query}"
        </div>
      )}

      <style>{`@keyframes sbspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
