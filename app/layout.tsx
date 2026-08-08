import type { Metadata, Viewport } from "next";
import { Playfair_Display, Jost } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ProductSync } from "@/components/ProductSync";

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const jost = Jost({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#1A1A1A',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://admin.silveri.in'),
  title: {
    default: "Silveri — Admin Dashboard",
    template: "%s | Silveri Admin",
  },
  description: "Silveri Admin Portal — manage products, orders, users, and site settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${jost.variable}`}>
      <body className="min-h-screen bg-[#F5F3EF] font-[family-name:var(--font-body)]">
        <AuthProvider>
          {/* Subscribe to Firestore products globally — used by Dashboard, Products, Live Market */}
          <ProductSync />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
