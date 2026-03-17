import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NodeLabz — AI Data Agency",
  description: "AI-powered marketing intelligence platform for LATAM businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark overflow-hidden" suppressHydrationWarning>
      <body className={`${inter.className} overflow-hidden h-screen`} style={{ backgroundColor: "#171717" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
