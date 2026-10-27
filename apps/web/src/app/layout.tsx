import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/layout/header";
import { Sidebar } from "../components/layout/sidebar";

export const metadata: Metadata = {
  title: "Trafiora — Database Workload Intelligence & Reliability Platform",
  description: "Precision infrastructure software: diagnose bottlenecks, reproduce workloads, compare optimizations, prevent regressions, and enforce overload protections.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-graphite-900 text-graphite-50 flex min-h-screen font-sans antialiased selection:bg-brand-tealDark selection:text-brand-tealLight">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
