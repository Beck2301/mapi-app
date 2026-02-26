"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type MapStyle  = "voyager" | "satellite" | "dark";

type AppSettings = {
  theme: ThemeMode;
  resolvedTheme: "light" | "dark";
  mapStyle: MapStyle;
  showAllRoutes: boolean;
  setTheme: (t: ThemeMode) => void;
  setMapStyle: (s: MapStyle) => void;
  setShowAllRoutes: (v: boolean) => void;
};

const AppSettingsContext = createContext<AppSettings>({
  theme: "light", resolvedTheme: "light",
  mapStyle: "voyager", showAllRoutes: true,
  setTheme: () => {}, setMapStyle: () => {}, setShowAllRoutes: () => {},
});

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState]         = useState<ThemeMode>("light");
  const [resolvedTheme, setResolved]   = useState<"light" | "dark">("light");
  const [mapStyle, setMapStyleState]   = useState<MapStyle>("voyager");
  const [showAllRoutes, setShowAll]    = useState(true);

  useEffect(() => {
    setThemeState((localStorage.getItem("bussv_theme") as ThemeMode) || "light");
    setMapStyleState((localStorage.getItem("bussv_map_style") as MapStyle) || "voyager");
    setShowAll(localStorage.getItem("bussv_show_all_routes") !== "false");
  }, []);

  useEffect(() => {
    const resolve = (): "light" | "dark" => {
      if (theme === "auto") {
        const h = new Date().getHours();
        return (h >= 18 || h < 6) ? "dark" : "light";
      }
      return theme;
    };
    const resolved = resolve();
    setResolved(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");

    if (theme === "auto") {
      const id = setInterval(() => {
        const r = resolve();
        setResolved(r);
        document.documentElement.classList.toggle("dark", r === "dark");
      }, 60_000);
      return () => clearInterval(id);
    }
  }, [theme]);

  const setTheme = (t: ThemeMode) => { setThemeState(t); localStorage.setItem("bussv_theme", t); };
  const setMapStyle = (s: MapStyle) => { setMapStyleState(s); localStorage.setItem("bussv_map_style", s); };
  const setShowAllRoutes = (v: boolean) => { setShowAll(v); localStorage.setItem("bussv_show_all_routes", String(v)); };

  return (
    <AppSettingsContext.Provider value={{ theme, resolvedTheme, mapStyle, showAllRoutes, setTheme, setMapStyle, setShowAllRoutes }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export const useAppSettings = () => useContext(AppSettingsContext);
