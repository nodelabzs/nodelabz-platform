"use client";

import { SmokeyBackground } from "@/components/ui/smokey-background";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative w-screen h-screen bg-gray-950">
      <SmokeyBackground className="absolute inset-0" color="#1e3a8a" />
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
        {children}
      </div>
    </main>
  );
}
