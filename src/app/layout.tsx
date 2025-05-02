import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import Navigation from "./components/Navigation";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "تحويل المستندات إلى نصوص",
  description: "PDF OCR processing application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar-en">
      <body
        className={`${ibmPlexSansArabic.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: `'IBM Plex Sans Arabic', sans-serif` }}
      >
        <ConvexClientProvider>
          <div className="h-screen flex flex-col overflow-hidden">
            <Navigation />
            <main className="flex-grow mt-16">
              {children}
            </main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
