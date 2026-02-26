"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, CircleMarker } from "react-leaflet";
import type { PathOptions, Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteResult } from "./SearchBar";
import { useAppSettings } from "@/context/AppSettingsContext";

const SAN_SALVADOR_CENTER: [number, number] = [13.6929, -89.2182];

function SetCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
}

function FitBounds({ geojson }: { geojson: any }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson?.features?.length) return;
    const L = require("leaflet");
    const bounds = L.geoJSON(geojson).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [60, 60] });
  }, [geojson, map]);
  return null;
}

type MapViewProps = {
  selectedRoute?: RouteResult | null;
  userLocation?: [number, number] | null;
  onRouteClick?: (route: RouteResult) => void;
};

export function MapView({ selectedRoute, userLocation, onRouteClick }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [allRoutesGeoJSON, setAllRoutesGeoJSON] = useState<any>(null);
  const [selectedGeoJSON, setSelectedGeoJSON] = useState<any>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const geoJsonKeyRef = useRef(0);
  const { mapStyle, showAllRoutes, resolvedTheme } = useAppSettings();

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient) return;
    fetch("/api/routes/san-salvador")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAllRoutesGeoJSON(data); })
      .catch(console.error);
  }, [isClient]);

  useEffect(() => {
    if (!isClient || !selectedRoute) { setSelectedGeoJSON(null); return; }
    setIsLoadingRoute(true);
    setSelectedGeoJSON(null);
    fetch(`/api/routes/${encodeURIComponent(selectedRoute.code)}/paths`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { geoJsonKeyRef.current += 1; setSelectedGeoJSON(data); } })
      .catch(console.error)
      .finally(() => setIsLoadingRoute(false));
  }, [isClient, selectedRoute]);

  if (!isClient) return <div style={{ width: "100%", height: "100%", background: "#e2e8f0" }} />;

  const center = userLocation ?? SAN_SALVADOR_CENTER;

  const getRouteStyle = (feature?: any): PathOptions => {
    const dir = feature?.properties?.direction || feature?.properties?.d_RECORRID || "";
    const isIda = dir.toLowerCase().includes("ida");
    return {
      color: isIda ? "#2563eb" : "#059669",
      weight: 2.5,
      opacity: 0.55,
    };
  };

  const onEachFeature = (feature: any, layer: Layer) => {
    layer.on("click", () => {
      if (!onRouteClick) return;
      const p = feature.properties || {};
      const routeData: RouteResult = {
        code:             p.code || p.NAME || p.name || "",
        name:             p.route_name || p.name || p.code || "",
        description:      `${p.d_ORIGEN || p.origen || ""} - ${p.d_DESTINO || p.destino || ""}`,
        origen:           p.d_ORIGEN || p.origen || "",
        destino:          p.d_DESTINO || p.destino || "",
        tipo_ruta:        p.d_TIPO_RUT || p.tipo_ruta || "",
        tipo_unidad:      p.d_TIPO_UNI || p.tipo_unidad || "",
        recorrido:        p.d_RECORRID || p.direction || p.recorrido || "",
        tarifa:           String(p.TARIFA_AUT ?? p.tarifa ?? ""),
        tarifa_excedente: String(p.TARIFA_EXC ?? p.tarifa_excedente ?? ""),
        kilometros:       String(p.KILOMETROS ?? p.kilometros ?? ""),
        codigo_rut:       p.CODIGO_RUT || p.codigo_rut || "",
        h_inicio_lv:      p.H_INIC_LV || p.h_inicio_lv || "",
        h_fin_lv:         p.H_FIN_LV  || p.h_fin_lv  || "",
        h_inicio_sd:      p.H_INIC_SD || p.h_inicio_sd || "",
        h_fin_sd:         p.H_FIN_SD  || p.h_fin_sd  || "",
        comentario:       p.Comentario || p.comentario || "",
        municipio:        p.NA2 || p.municipio || "SAN SALVADOR",
      };
      onRouteClick(routeData);
    });

    layer.on("mouseover", function (this: any) { this.setStyle({ weight: 5, opacity: 0.9 }); });
    layer.on("mouseout",  function (this: any) { this.setStyle({ weight: 2.5, opacity: 0.55 }); });
  };

  const TILES: Record<string, { url: string; attribution: string }> = {
    voyager: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, GeoEye',
    },
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    },
  };

  const effectiveStyle = mapStyle === "voyager" && resolvedTheme === "dark" ? "dark" : mapStyle;
  const tile = TILES[effectiveStyle] || TILES.voyager;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {isLoadingRoute && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2 rounded-full text-sm
          bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-md
          text-sky-600 dark:text-sky-400">
          <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2.5px solid #bae6fd", borderTopColor: "#0284c7", animation: "mapspin 0.7s linear infinite" }} />
          Cargando ruta...
        </div>
      )}

      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer key={effectiveStyle} url={tile.url} attribution={tile.attribution} />

        {userLocation && <SetCenter center={userLocation} />}

        {userLocation && (
          <>
            <CircleMarker center={userLocation} radius={18}
              pathOptions={{ color: "#0284c7", weight: 2, fillColor: "#0284c7", fillOpacity: 0.12, opacity: 0.4 }} />
            <CircleMarker center={userLocation} radius={7}
              pathOptions={{ color: "#fff", weight: 2.5, fillColor: "#0284c7", fillOpacity: 1 }} />
          </>
        )}

        {showAllRoutes && allRoutesGeoJSON && (
          <GeoJSON key={`all-${effectiveStyle}`} data={allRoutesGeoJSON} style={getRouteStyle} onEachFeature={onEachFeature} />
        )}

        {selectedGeoJSON && (
          <>
            <GeoJSON key={`sel-${geoJsonKeyRef.current}`} data={selectedGeoJSON}
              style={() => ({ color: "#dc2626", weight: 5.5, opacity: 1 })}
              onEachFeature={onEachFeature} />
            <FitBounds geojson={selectedGeoJSON} />
          </>
        )}
      </MapContainer>

      <style>{`
        @keyframes mapspin { to { transform: rotate(360deg); } }
        .leaflet-control-attribution { display: none !important; }
        .leaflet-control-zoom { display: none !important; }
        .leaflet-interactive { cursor: pointer !important; }
      `}</style>
    </div>
  );
}
