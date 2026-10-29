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
      <body className="bg-[#050607] text-[#E8EAF0] flex min-h-screen font-sans antialiased selection:bg-[#174338] selection:text-[#E8EAF0]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-3.5 sm:p-5 lg:p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
