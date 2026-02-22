import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import UserSync from "@/components/UserSync";
import OnlineStatusSync from "@/components/OnlineStatusSync";



const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tars Chat",
  description: "Real-time messaging app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <ConvexClientProvider>
          <UserSync />
          <OnlineStatusSync />
          {children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}