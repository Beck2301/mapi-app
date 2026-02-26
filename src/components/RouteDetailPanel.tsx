"use client";

import type { RouteResult } from "./SearchBar";

// ── Paleta pastel adaptada al tema oscuro ─────────────────────────
const PASTEL = [
  { bg: "rgba(255,249,230,0.07)", border: "rgba(251,191,36,0.25)",  accent: "#fbbf24" }, // Amarillo
  { bg: "rgba(232,245,233,0.07)", border: "rgba(52,211,153,0.25)",  accent: "#34d399" }, // Verde menta
  { bg: "rgba(227,242,253,0.07)", border: "rgba(96,165,250,0.25)",  accent: "#60a5fa" }, // Azul claro
  { bg: "rgba(243,232,255,0.07)", border: "rgba(196,181,253,0.25)", accent: "#c4b5fd" }, // Lavanda
  { bg: "rgba(252,228,236,0.07)", border: "rgba(251,113,133,0.25)", accent: "#fb7185" }, // Rosa pálido
  { bg: "rgba(255,243,224,0.07)", border: "rgba(251,146,60,0.25)",  accent: "#fb923c" }, // Durazno
];

// ── Helper ──────────────────────────────────────────────────────
function clean(val?: string | null) {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed === "" || trimmed === " " ? null : trimmed;
}

// ── Fila de la tabla de detalles ────────────────────────────────
function InfoRow({ label, value, accent }: { label: string; value?: string | null; accent: string }) {
  const v = clean(value);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0.55rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 500 }}>{label}</span>
      {v ? (
        <span style={{ fontSize: "0.82rem", color: "#f0f2ff", fontWeight: 600, textAlign: "right", maxWidth: "55%" }}>
          {v}
        </span>
      ) : (
        <span style={{ fontSize: "0.78rem", color: "#374151", fontStyle: "italic" }}>—</span>
      )}
    </div>
  );
}

// ── Chip informativo ────────────────────────────────────────────
function Chip({ label, value, color }: { label: string; value?: string | null; color: string }) {
  const v = clean(value);
  if (!v) return null;
  return (
    <div style={{
      background: `${color}18`, border: `1px solid ${color}40`,
      borderRadius: "0.65rem", padding: "0.5rem 0.75rem", flex: "1 1 auto", minWidth: 80,
    }}>
      <p style={{ margin: 0, fontSize: "0.68rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ margin: "0.15rem 0 0", fontSize: "0.88rem", fontWeight: 700, color }}>{v}</p>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────
type RouteDetailPanelProps = {
  route: RouteResult;
  paletteIndex?: number;
  onClose?: () => void;
};

export function RouteDetailPanel({ route, paletteIndex = 0, onClose }: RouteDetailPanelProps) {
  const p = PASTEL[paletteIndex % PASTEL.length];

  const hasHorarioLV = clean(route.h_inicio_lv) || clean(route.h_fin_lv);
  const hasHorarioSD = clean(route.h_inicio_sd) || clean(route.h_fin_sd);

  return (
    <div style={{
      background: p.bg,
      border: `1px solid ${p.border}`,
      borderRadius: "1.1rem",
      overflow: "hidden",
      marginBottom: "0.5rem",
    }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{
        padding: "0.9rem 1rem 0.7rem",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "flex-start", gap: "0.75rem",
      }}>
        {/* Ícono */}
        <div style={{
          width: 44, height: 44, borderRadius: "0.7rem", flexShrink: 0,
          background: `${p.accent}22`, border: `1px solid ${p.accent}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={p.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 9h20" />
            <circle cx="7" cy="19" r="1.5" />
            <circle cx="17" cy="19" r="1.5" />
            <path d="M12 5v4" />
          </svg>
        </div>

        {/* Nombre y código */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.15rem" }}>
            <span style={{
              background: `${p.accent}22`, border: `1px solid ${p.accent}44`,
              color: p.accent, fontSize: "0.72rem", fontWeight: 800,
              fontFamily: "monospace", padding: "2px 8px", borderRadius: "0.4rem",
              letterSpacing: "0.04em",
            }}>
              {clean(route.codigo_rut) || route.code}
            </span>
            {clean(route.recorrido) && (
              <span style={{
                background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
                color: "#a5b4fc", fontSize: "0.68rem", fontWeight: 600,
                padding: "2px 7px", borderRadius: "0.4rem",
              }}>{route.recorrido}</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#f0f2ff", lineHeight: 1.3 }}>
            {clean(route.origen) || "—"} → {clean(route.destino) || "—"}
          </p>
          {clean(route.municipio) && (
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "#6b7280" }}>
              📍 {route.municipio}
            </p>
          )}
        </div>

        {/* Botón cerrar */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              width: 28, height: 28, borderRadius: "50%", cursor: "pointer",
              color: "#6b7280", fontSize: "0.8rem", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        )}
      </div>

      {/* ── Chips rápidos ────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", padding: "0.75rem 1rem 0.5rem" }}>
        <Chip label="Tipo" value={route.tipo_ruta} color={p.accent} />
        <Chip label="Unidad" value={route.tipo_unidad} color={p.accent} />
        {route.tarifa && parseFloat(route.tarifa) > 0 && (
          <Chip label="Tarifa" value={`$${parseFloat(route.tarifa).toFixed(2)}`} color="#4ade80" />
        )}
        {route.kilometros && (
          <Chip label="Distancia" value={`${parseFloat(route.kilometros).toFixed(1)} km`} color="#94a3b8" />
        )}
      </div>

      {/* ── Tabla de detalles ────────────────────────────────── */}
      <div style={{ padding: "0 1rem 0.25rem" }}>

        {/* Horarios L-V */}
        {hasHorarioLV && (
          <>
            <p style={{ margin: "0.6rem 0 0", fontSize: "0.68rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              Horario Lun–Vie
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <InfoRow label="Inicio" value={route.h_inicio_lv} accent={p.accent} />
              <InfoRow label="Fin" value={route.h_fin_lv} accent={p.accent} />
            </div>
          </>
        )}

        {/* Horarios S-D */}
        {hasHorarioSD && (
          <>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>
              Horario Sáb–Dom
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <InfoRow label="Inicio" value={route.h_inicio_sd} accent={p.accent} />
              <InfoRow label="Fin" value={route.h_fin_sd} accent={p.accent} />
            </div>
          </>
        )}

        {/* Otros datos */}
        <InfoRow label="Nombre interno" value={route.code} accent={p.accent} />
        <InfoRow label="Código ruta" value={route.codigo_rut} accent={p.accent} />
        {route.tarifa_excedente && parseFloat(route.tarifa_excedente) > 0 && (
          <InfoRow label="Tarifa excedente" value={`$${parseFloat(route.tarifa_excedente).toFixed(2)}`} accent={p.accent} />
        )}
        {clean(route.comentario) && (
          <InfoRow label="Comentario" value={route.comentario} accent={p.accent} />
        )}
      </div>

      {/* ── Footer: navegación en el mapa ──────────────────── */}
      <div style={{ padding: "0.5rem 1rem 0.85rem", marginTop: "0.25rem" }}>
        <div style={{
          background: `${p.accent}10`, border: `1px solid ${p.accent}20`,
          borderRadius: "0.6rem", padding: "0.5rem 0.75rem",
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={p.accent} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span style={{ fontSize: "0.75rem", color: "#8b92b8" }}>
            Ruta resaltada en naranja en el mapa
          </span>
        </div>
      </div>
    </div>
  );
}
