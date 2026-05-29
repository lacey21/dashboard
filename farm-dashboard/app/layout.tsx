import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FarmProvider } from "@/contexts/FarmContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GreenLeaf CEA Dashboard",
  description: "Precision agriculture storytelling dashboard for GreenLeaf CEA",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-sage-50 text-sage-900">
        <FarmProvider>
          <ChatProvider>
            <AppShell>{children}</AppShell>
          </ChatProvider>
        </FarmProvider>
      </body>
    </html>
  );
}
