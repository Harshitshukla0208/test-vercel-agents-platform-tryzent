import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast-provider";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "LeoQui | AI Learning Platform for Students, Parents & Teachers",
  description: "Discover LeoQui, the AI-powered learning companion that personalises tutoring, homework help, and classroom collaboration for students, parents, and teachers.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#714B90',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <ToastProvider />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
