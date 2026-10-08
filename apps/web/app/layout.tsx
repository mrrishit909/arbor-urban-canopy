import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "ARBOR", description: "ARBOR: an urban tree canopy planner with growth, heat and budget scenarios. Synthetic district, simplified model, not for real planning decisions." };
export const viewport: Viewport = { themeColor: "#161B16", width: "device-width", initialScale: 1 };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
