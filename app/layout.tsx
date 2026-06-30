import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. IMPORT KOMPONEN AUTO LOGOUT KITA
import AutoLogout from "@/components/AutoLogout"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Matrix - Ascon PLC Monitoring System",
  description: "Dashboard monitoring PLC terpusat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        
        {/* 2. LETAKKAN DI SINI */}
        <AutoLogout /> 
        
        {children}
      </body>
    </html>
  );
}

