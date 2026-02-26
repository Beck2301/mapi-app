"use client";

import {
  X, Bus, MapPin, Clock, DollarSign, Navigation,
  Bookmark, BookmarkCheck, ArrowRight, Map, Info
} from "lucide-react";
import type { RouteResult } from "./SearchBar";
import { useAppSettings } from "@/context/AppSettingsContext";

function clean(v?: string | null) {
  const t = v?.trim();
  return t && t !== "" ? t : null;
}

function DataRow({ label, value, icon: Icon }: {
  label: string; value?: string | null; icon?: React.ElementType;
}) {
  const v = clean(value);
  if (!v) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
        {Icon && <Icon size={13} className="shrink-0" />}
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 text-right max-w-[55%]">{v}</span>
    </div>
  );
}

function Tag({ children, green }: { children: React.ReactNode; green?: boolean }) {
  return green
    ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40">{children}</span>
    : <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700/40">{children}</span>;
}

type RouteModalProps = {
  route: RouteResult | null;
  isSaved: boolean;
  onSave: (route: RouteResult) => void;
  onUnsave: (code: string) => void;
  /** Cierra el modal pero MANTIENE la ruta resaltada en el mapa */
  onViewOnMap: () => void;
  /** Cierra el modal y BORRA la ruta del mapa */
  onDismiss: () => void;
};

export function RouteModal({ route, isSaved, onSave, onUnsave, onViewOnMap, onDismiss }: RouteModalProps) {
  const { resolvedTheme } = useAppSettings();
  if (!route) return null;

  const hasSchedule = clean(route.h_inicio_lv) || clean(route.h_fin_lv);

  return (
    <>
      <div
        onClick={onViewOnMap}
        className="fixed inset-0 z-[400]"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)", animation: "foverlay 0.2s ease" }}
      />

      <div className="fixed z-[500] inset-0 flex items-end sm:items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full sm:w-[480px] sm:max-w-[calc(100vw-2rem)]"
          style={{ animation: "fmodal 0.28s cubic-bezier(0.34,1.36,0.64,1)" }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[78vh]">


            <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center bg-sky-50 dark:bg-sky-900/30">
                <Bus size={22} className="text-sky-600 dark:text-sky-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-700/40">
                    {clean(route.codigo_rut) || route.code}
                  </span>
                  {clean(route.recorrido) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {route.recorrido}
                    </span>
                  )}
                </div>
                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                  {clean(route.origen) || "—"}{" "}
                  <ArrowRight size={13} className="inline text-slate-400" />{" "}
                  {clean(route.destino) || "—"}
                </p>
              </div>

              <button
                onClick={onDismiss}
                title="Cerrar y quitar ruta del mapa"
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>


            <div className="flex gap-2 px-5 py-3 flex-wrap border-b border-slate-100 dark:border-white/[0.06]">
              {clean(route.tipo_ruta)   && <Tag>{route.tipo_ruta}</Tag>}
              {clean(route.tipo_unidad) && <Tag>{route.tipo_unidad}</Tag>}
              {route.tarifa && parseFloat(route.tarifa) > 0 && (
                <Tag green>${parseFloat(route.tarifa).toFixed(2)}</Tag>
              )}
              {clean(route.kilometros) && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-white/10">
                  {parseFloat(route.kilometros).toFixed(1)} km
                </span>
              )}
            </div>


            <div className="overflow-y-auto flex-1 px-5 py-2">
              {hasSchedule && (
                <div className="mt-2 mb-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Horarios</p>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 py-0.5">
                    <DataRow label="Lun–Vie inicio" value={route.h_inicio_lv} icon={Clock} />
                    <DataRow label="Lun–Vie fin"    value={route.h_fin_lv}    icon={Clock} />
                    <DataRow label="Sáb–Dom inicio" value={route.h_inicio_sd} icon={Clock} />
                    <DataRow label="Sáb–Dom fin"    value={route.h_fin_sd}    icon={Clock} />
                  </div>
                </div>
              )}

              <div className="mt-3 mb-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Detalles</p>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 py-0.5">
                  <DataRow label="Tarifa" value={route.tarifa && parseFloat(route.tarifa) > 0 ? `$${parseFloat(route.tarifa).toFixed(2)}` : null} icon={DollarSign} />
                  <DataRow label="Tarifa excedente" value={route.tarifa_excedente && parseFloat(route.tarifa_excedente) > 0 ? `$${parseFloat(route.tarifa_excedente).toFixed(2)}` : null} icon={DollarSign} />
                  <DataRow label="Código ruta" value={route.codigo_rut} icon={Info} />
                  <DataRow label="Municipio"   value={route.municipio}  icon={MapPin} />
                  <DataRow label="Distancia"   value={clean(route.kilometros) ? `${parseFloat(route.kilometros).toFixed(1)} km` : null} icon={Navigation} />
                </div>
              </div>

              {clean(route.comentario) && (
                <div className="mt-3 mb-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 py-3">{route.comentario}</p>
                </div>
              )}
            </div>

            <div className="px-5 pb-6 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex flex-col gap-2.5">
              <button
                onClick={onViewOnMap}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-semibold text-sm
                  bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/8 dark:hover:bg-white/12 dark:text-slate-200
                  transition-all duration-150 active:scale-[0.98]"
              >
                <Map size={16} />
                Ver en el mapa
              </button>

              <button
                onClick={() => isSaved ? onUnsave(route.code) : onSave(route)}
                className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-semibold text-sm
                  transition-all duration-150 active:scale-[0.98]
                  ${isSaved
                    ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/40"
                    : "bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                  }`}
              >
                {isSaved
                  ? <><BookmarkCheck size={16} /> Guardada en Futuras rutas</>
                  : <><Bookmark size={16} /> Guardar en Futuras rutas</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes foverlay { from { opacity:0 } to { opacity:1 } }
        @keyframes fmodal {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </>
  );
}
