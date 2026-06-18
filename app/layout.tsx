import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plotlyst",
  description: "Presentation-grade business chart editor"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
