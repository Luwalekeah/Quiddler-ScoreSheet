import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quiddler ScoreSheet",
  description: "Score Quiddler at the table. Scores save on your phone and sync when you're back online.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Quiddler",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Never set maximumScale or userScalable: false. Blocking zoom fails
  // WCAG 1.4.4 Resize Text.
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
