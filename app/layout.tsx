import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { appearanceBootstrapScript } from "@/lib/appearance";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Plotlyst",
  description: "Presentation-grade business chart editor"
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#161b1a" }
  ]
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Resolve the theme before first paint so the chrome never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrapScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
