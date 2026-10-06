import type { Metadata } from "next";
import { Inter, Playfair_Display, Caveat, Ubuntu, DM_Sans } from "next/font/google";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { AgentProvider } from "@/components/dashboard/AgentProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-ubuntu",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ambition Gazette | Reality Monitor for Your Plans",
  description: "Ambition Gazette watches reality for changes that could make your plan wrong. State what must stay true, and see the evidence when an assumption stops holding.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.variable} ${playfair.variable} ${caveat.variable} ${ubuntu.variable} ${dmSans.variable} bg-[#FAF8F5] text-[#1A1918] min-h-screen antialiased selection:bg-[#701A23]/15 selection:text-[#701A23]`}>
        <OfflineBanner />
        <AgentProvider>{children}</AgentProvider>
      </body>
    </html>
  );
}
