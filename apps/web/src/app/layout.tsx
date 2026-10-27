import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/layout/header";
import { Sidebar } from "../components/layout/sidebar";

export const metadata: Metadata = {
  title: "Trafiora — Database Workload Intelligence & Reliability Platform",
  description: "Diagnose database bottlenecks, reproduce workloads, compare optimizations, prevent regressions, and enforce overload protection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-gray-100 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
