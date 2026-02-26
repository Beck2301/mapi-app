import { MapSection } from "@/components/MapSection";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "BusSV — Rutas de Bus en El Salvador",
  description: "Encuentra rutas de transporte público en El Salvador. Busca cómo llegar de A a B con buses del VMT.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070f",
};

export default function Home() {
  return (
    <div style={{ width: "100dvw", height: "100dvh", overflow: "hidden" }}>
      <MapSection />
    </div>
  );
}
