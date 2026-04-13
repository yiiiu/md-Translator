import type { Metadata } from "next";
import { Inter, Manrope, Geist_Mono } from "next/font/google";
import { getAppSettings } from "@/lib/db";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MD Translator",
  description: "Translate Markdown documents with real-time rendering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = getAppSettings();

  return (
    <html
      lang={settings.ui_language}
      className={`${inter.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-[#f9f9ff] text-[#111c2d]">
        {children}
      </body>
    </html>
  );
}
