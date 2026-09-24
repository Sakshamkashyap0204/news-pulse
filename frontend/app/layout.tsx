import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "News Pulse", description: "Topic-clustered news activity timeline" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
