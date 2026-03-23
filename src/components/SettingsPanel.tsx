"use client";

import {
  Settings, X, Sun, Moon, Clock, Map, Satellite,
  Circle, User, ChevronRight
} from "lucide-react";
import { useAppSettings, type ThemeMode, type MapStyle } from "@/context/AppSettingsContext";

const LEGEND = [
  { color: "#2563eb", label: "Ida (hacia el destino)" },
  { color: "#059669", label: "Regreso (vuelta al origen)" },
  { color: "#dc2626", label: "Ruta seleccionada" },
  { color: "#0284c7", label: "Tu ubicación GPS" },
];

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, mapStyle, showAllRoutes, setTheme, setMapStyle, setShowAllRoutes } = useAppSettings();

  return (
    <>
      {open && (
        <div onClick={onClose}
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
          style={{ animation: "fadein 0.2s ease" }} />
      )}

      <div className={`
        fixed top-0 right-0 z-[300] h-full w-[300px] max-w-full flex flex-col
        bg-white dark:bg-slate-900
        border-l border-slate-200 dark:border-white/10 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "translate-x-full"}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
              <Settings size={16} className="text-sky-600 dark:text-sky-400" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">Configuración</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
              Apariencia
            </h3>
            <div className="space-y-1.5">
              {([
                { mode: "light" as ThemeMode, icon: Sun,   label: "Claro",       desc: "Siempre modo claro" },
                { mode: "dark"  as ThemeMode, icon: Moon,  label: "Oscuro",      desc: "Siempre modo oscuro" },
                { mode: "auto"  as ThemeMode, icon: Clock, label: "Automático",  desc: "Claro de 6AM–6PM" },
              ]).map(({ mode, icon: Icon, label, desc }) => {
                const active = theme === mode;
                return (
                  <button key={mode} onClick={() => setTheme(mode)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                      ${active
                        ? "bg-slate-50 border-slate-900 dark:bg-slate-800 dark:border-slate-300"
                        : "bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20"
                      }`}>
                    <Icon size={16} className={active ? "text-slate-900 dark:text-slate-100" : "text-slate-400"} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${active ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    {active && (
                      <div className="w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-300 flex items-center justify-center shrink-0">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white dark:text-slate-900" strokeWidth="3"><path d="m20 6-11 11-5-5"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
              Estilo del mapa
            </h3>
            <div className="space-y-1.5">
              {([
                { style: "voyager"   as MapStyle, icon: Map,       label: "Estándar",   desc: "Colores reales con colonias" },
                { style: "satellite" as MapStyle, icon: Satellite,  label: "Satélite",   desc: "Imágenes ESRI reales" },
                { style: "dark"      as MapStyle, icon: Moon,       label: "Oscuro",     desc: "Modo noche, rutas destacadas" },
              ]).map(({ style, icon: Icon, label, desc }) => {
                const active = mapStyle === style;
                return (
                  <button key={style} onClick={() => setMapStyle(style)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                      ${active
                        ? "bg-slate-50 border-slate-900 dark:bg-slate-800 dark:border-slate-300"
                        : "bg-white border-slate-200 hover:border-slate-300 dark:bg-white/5 dark:border-white/10 dark:hover:border-white/20"
                      }`}>
                    <Icon size={16} className={active ? "text-slate-900 dark:text-slate-100" : "text-slate-400"} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${active ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"}`}>{label}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    {active && (
                      <div className="w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-300 flex items-center justify-center shrink-0">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white dark:text-slate-900" strokeWidth="3"><path d="m20 6-11 11-5-5"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
              Mapa
            </h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <Map size={22} className={showAllRoutes ? "text-slate-900 dark:text-slate-100" : "text-slate-400"} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mostrar todas las rutas</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {showAllRoutes ? "Visible todo el tiempo" : "Solo con búsqueda activa"}
                  </p>
                </div>
                <button onClick={() => setShowAllRoutes(!showAllRoutes)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0
                    ${showAllRoutes ? "bg-slate-900 dark:bg-slate-300" : "bg-slate-200 dark:bg-slate-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200
                    ${showAllRoutes ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
              Leyenda de colores
            </h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
              {LEGEND.map(({ color, label }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2.5">
                  <div style={{ width: 28, height: 5, background: color, borderRadius: 3, flexShrink: 0 }} />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
              Cuenta
            </h3>
            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <User size={16} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Iniciar sesión</p>
                  <p className="text-xs text-slate-400">Próximamente disponible</p>
                </div>
              </div>
              <button disabled className="w-full py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-semibold text-slate-400 cursor-not-allowed flex items-center justify-between px-3">
                <span>Crear cuenta / Iniciar sesión</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </section>

          <p className="text-center text-xs text-slate-300 dark:text-slate-600 pb-2">
            BusSV v0.1.0 Beta · Datos VMT El Salvador
          </p>
        </div>
      </div>

      <style>{`@keyframes fadein { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </>
  );
}
