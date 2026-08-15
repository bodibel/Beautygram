import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { FilterProvider } from "@/lib/filter-context";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { NotificationProvider } from "@/lib/notification-context";
import { ThemeProvider } from "@/lib/theme-context";
import { SalonProfileProvider } from "@/lib/salon-profile-context";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GlowySpot - Find Your Beauty Professional",
  description: "Book appointments with the best beauty professionals near you.",
  keywords: ["szépség", "fodrász", "kozmetika", "masszázs", "szalon", "Budapest", "Magyarország"],
  authors: [{ name: "GlowySpot" }],
  openGraph: {
    type: "website",
    locale: "hu_HU",
    url: "https://glowyspot.com",
    siteName: "GlowySpot",
    title: "GlowySpot - Szépségipar Szakemberei",
    description: "Találd meg a legjobb szépségipari szakembereket Magyarországon",
  },
  robots: { index: true, follow: true },
};

// Inline script to prevent flash-of-incorrect-theme (FOIT).
// Absence of the key (!stored) means "system" preference — intentional, not a miss.
// ThemeProvider removes the key when the user selects "system" mode.
const foitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('glowyspot-theme');
      var isDark = stored === 'dark';
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: foitScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <GoogleMapsProvider>
              <FilterProvider>
                <SalonProfileProvider>
                  <NotificationProvider>
                    {children}
                    <Toaster richColors position="top-center" closeButton />
                  </NotificationProvider>
                </SalonProfileProvider>
              </FilterProvider>
            </GoogleMapsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
