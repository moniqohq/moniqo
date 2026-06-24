import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moniqo — Personal Finance",
  description: "Modern zero-based budgeting for everyone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#080C14] text-[#E8EEF8] antialiased">{children}</body>
    </html>
  );
}
