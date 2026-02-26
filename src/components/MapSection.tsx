"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Search, MapPin, Menu, Bookmark, Trash2, Bus, X, ArrowRight } from "lucide-react";
import { SearchBar, type RouteResult } from "./SearchBar";
import { RouteModal } from "./RouteModal";
import { SettingsPanel } from "./SettingsPanel";
import { useAppSettings } from "@/context/AppSettingsContext";

const MapView = dynamic(() => import("./MapView").then(m => m.MapView), { ssr: false });

const SAVED_KEY = "bussv_saved_routes";
function loadSaved(): RouteResult[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function persistSaved(r: RouteResult[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(r.slice(0, 20)));
}

export function MapSection() {
  const { resolvedTheme } = useAppSettings();
  const isDark = resolvedTheme === "dark";

  const [selectedRoute, setSelectedRoute] = useState<RouteResult | null>(null);
  const [modalRoute, setModalRoute]       = useState<RouteResult | null>(null);

  const [userLocation, setUserLocation]   = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus]         = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [isSearchOpen, setIsSearchOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [sheetOpen, setSheetOpen]         = useState(true);
  const [savedRoutes, setSavedRoutes]     = useState<RouteResult[]>([]);

  useEffect(() => setSavedRoutes(loadSaved()), []);


  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setGpsStatus("ok"); },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleRouteSelect = useCallback((route: RouteResult) => {
    setSelectedRoute(route);
    setModalRoute(route);
    setIsSearchOpen(false);
  }, []);

  const handleViewOnMap = () => {
    setModalRoute(null);
    setSheetOpen(false);
  };

  const handleDismiss = () => {
    setModalRoute(null);
    setSelectedRoute(null);
    setSheetOpen(true);
  };

  const handleClearRoute = () => {
    setSelectedRoute(null);
    setSheetOpen(true);
  };

  const handleGps = () => {
    if (gpsStatus === "loading") return;
    setGpsStatus("loading");
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserLocation([pos.coords.latitude, pos.coords.longitude]); setGpsStatus("ok"); },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = (route: RouteResult) => {
    setSavedRoutes(prev => {
      const updated = [route, ...prev.filter(r => r.code !== route.code)];
      persistSaved(updated);
      return updated;
    });
  };
  const handleUnsave = (code: string) => {
    setSavedRoutes(prev => { const u = prev.filter(r => r.code !== code); persistSaved(u); return u; });
  };
  const handleDelete = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleUnsave(code);
    if (selectedRoute?.code === code) setSelectedRoute(null);
  };

  const isSaved = (code: string) => savedRoutes.some(r => r.code === code);

  const C = {
    ctrl:   isDark ? "rgba(15,23,42,0.88)"    : "rgba(255,255,255,0.92)",
    ctrlB:  isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    shBg:   isDark ? "rgba(15,23,42,0.96)"    : "rgba(255,255,255,0.96)",
    shBord: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    shSh:   isDark ? "0 -4px 24px rgba(0,0,0,0.45)" : "0 -4px 20px rgba(0,0,0,0.07)",
    text:   isDark ? "#f1f5f9"  : "#0f172a",
    sub:    isDark ? "#64748b"  : "#6b7280",
    handle: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
  };

  // Visible solo cuando hay ruta activa pero el modal está cerrado
  const showMiniCard = selectedRoute && !modalRoute;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "100dvh" }}>


      <div className="absolute inset-0 z-0">
        <MapView
          selectedRoute={selectedRoute}
          userLocation={userLocation}
          onRouteClick={handleRouteSelect}
        />
      </div>


      <RouteModal
        route={modalRoute}
        isSaved={modalRoute ? isSaved(modalRoute.code) : false}
        onSave={handleSave}
        onUnsave={handleUnsave}
        onViewOnMap={handleViewOnMap}
        onDismiss={handleDismiss}
      />


      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />


      <div className="absolute top-0 left-0 right-0 z-[100] flex gap-2 items-start p-3">
        <div className="flex-1">
          {isSearchOpen ? (
            <SearchBar onRouteSelect={handleRouteSelect} autoFocus onClose={() => setIsSearchOpen(false)} />
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center gap-3 text-left rounded-2xl"
              style={{
                background: C.ctrl, border: `1px solid ${C.ctrlB}`,
                padding: "0.7rem 1rem", backdropFilter: "blur(20px)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)", cursor: "text",
              }}
            >
              <Search size={17} className="text-sky-500 shrink-0" />
              <span style={{ flex: 1, color: C.sub, fontSize: "0.92rem" }}>
                {selectedRoute ? `Ruta ${selectedRoute.code} — ${selectedRoute.destino}` : "¿A dónde vas?"}
              </span>
              {selectedRoute && (
                <span className="font-mono text-xs px-2 py-0.5 rounded-md shrink-0"
                  style={{ background: "rgba(234,88,12,0.1)", color: "#ea580c", border: "1px solid rgba(234,88,12,0.2)" }}>
                  {selectedRoute.code}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={handleGps} title="Mi ubicación"
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: C.ctrl, border: `1px solid ${C.ctrlB}`, backdropFilter: "blur(20px)", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", cursor: "pointer" }}>
            {gpsStatus === "loading"
              ? <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2.5px solid #bae6fd", borderTopColor: "#0284c7", animation: "shspin 0.7s linear infinite" }} />
              : <MapPin size={18} style={{ color: gpsStatus === "ok" ? "#0284c7" : gpsStatus === "denied" ? "#dc2626" : C.sub }} />
            }
          </button>
          <button onClick={() => setSettingsOpen(true)} title="Configuración"
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: C.ctrl, border: `1px solid ${C.ctrlB}`, backdropFilter: "blur(20px)", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", cursor: "pointer" }}>
            <Menu size={18} style={{ color: C.sub }} />
          </button>
        </div>
      </div>


      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", flexDirection: "column",
        transform: sheetOpen ? "translateY(0)" : "translateY(calc(100% - 52px))",
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>
        {showMiniCard && selectedRoute && (
          <div
            style={{
              alignSelf: "flex-start",
              margin: "0 0 8px 12px",
              animation: "fcardIn 0.28s cubic-bezier(0.34,1.3,0.64,1)",
            }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.75rem",
              background: C.ctrl,
              border: `1px solid ${C.ctrlB}`,
              backdropFilter: "blur(20px)",
              borderRadius: "1rem",
              padding: "0.65rem 0.85rem 0.65rem 0.8rem",
              boxShadow: isDark
                ? "0 6px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.3)"
                : "0 4px 20px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07)",
            }}>
                <div style={{ width: 3.5, height: 40, background: "#dc2626", borderRadius: 4, flexShrink: 0 }} />

              <div style={{ minWidth: 0 }}>
                <p style={{
                  margin: 0, fontWeight: 800, fontSize: "0.92rem", color: C.text,
                  display: "flex", alignItems: "center", gap: "0.3rem",
                }}>
                  <span style={{ fontFamily: "monospace", color: "#ea580c" }}>{selectedRoute.code}</span>
                  <span style={{ color: C.sub, fontSize: "0.75rem" }}>→</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>
                    {selectedRoute.destino}
                  </span>
                </p>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: C.sub }}>
                  {selectedRoute.origen} · Visible en el mapa
                </p>
              </div>

              <button
                onClick={() => setModalRoute(selectedRoute)}
                style={{
                  fontSize: "0.77rem", fontWeight: 700, color: "#0284c7",
                  background: "rgba(2,132,199,0.09)",
                  border: "1px solid rgba(2,132,199,0.2)",
                  borderRadius: "0.6rem", padding: "0.35rem 0.7rem",
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                Ver detalle
              </button>

              <button
                onClick={handleClearRoute}
                title="Quitar ruta del mapa"
                style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, padding: 4, display: "flex", flexShrink: 0 }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        <div style={{
          background: C.shBg, backdropFilter: "blur(20px)",
          borderRadius: "1.25rem 1.25rem 0 0",
          border: `1px solid ${C.shBord}`, borderBottom: "none",
          boxShadow: C.shSh,
          maxHeight: "55vh", display: "flex", flexDirection: "column",
        }}>


        <div onClick={() => setSheetOpen(v => !v)}
          style={{ cursor: "pointer", padding: "0.7rem 1.25rem 0.5rem", userSelect: "none" }}>
          <div style={{ width: 36, height: 4, background: C.handle, borderRadius: 2, margin: "0 auto 0.7rem" }} />
          <div className="flex items-center gap-2">
            <Bookmark size={15} style={{ color: "#0284c7" }} />
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: C.text }}>Futuras Rutas</h2>
            {savedRoutes.length > 0 && (
              <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(2,132,199,0.1)", color: "#0284c7" }}>
                {savedRoutes.length}
              </span>
            )}
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "0.25rem 1rem 1.5rem" }}>
          {savedRoutes.length === 0 && (
            <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
              <Bookmark size={26} style={{ color: C.sub, margin: "0 auto 0.5rem" }} />
              <p style={{ margin: 0, fontSize: "0.85rem", color: C.sub }}>
                Busca una ruta y guárdala aquí
              </p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: isDark ? "#475569" : "#94a3b8" }}>
                También puedes tocar cualquier línea en el mapa
              </p>
            </div>
          )}

          {savedRoutes.map(route => {
            const isActive = selectedRoute?.code === route.code;
            return (
              <div key={route.code} style={{ position: "relative", marginBottom: "0.5rem" }}>
                <button
                  onClick={() => handleRouteSelect(route)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                    background: isActive
                      ? isDark ? "rgba(2,132,199,0.10)" : "rgba(2,132,199,0.05)"
                      : isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.015)",
                    border: `1.5px solid ${isActive ? "rgba(2,132,199,0.3)" : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)")}`,
                    borderRadius: "0.85rem", padding: "0.75rem 3rem 0.75rem 0.75rem",
                    cursor: "pointer", textAlign: "left",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "0.5rem", flexShrink: 0,
                    background: isActive ? "rgba(2,132,199,0.12)" : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${isActive ? "rgba(2,132,199,0.25)" : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Bus size={15} style={{ color: isActive ? "#0284c7" : C.sub }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.15rem" }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 700,
                        padding: "1px 5px", borderRadius: "0.25rem",
                        background: "rgba(234,88,12,0.08)", color: "#ea580c",
                        border: "1px solid rgba(234,88,12,0.18)",
                      }}>Ruta {route.code}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.87rem", fontWeight: 700, color: C.text, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {route.destino || route.name}
                    </p>
                    <p style={{ margin: "0.05rem 0 0", fontSize: "0.7rem", color: C.sub, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                      {route.origen} → {route.destino}
                    </p>
                  </div>
                </button>
                <button
                  onClick={e => handleDelete(route.code, e)}
                  title="Eliminar"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sub }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; e.currentTarget.style.color = "#dc2626"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.sub; }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <style>{`
        @keyframes shspin  { to { transform: rotate(360deg); } }
        @keyframes fcardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
