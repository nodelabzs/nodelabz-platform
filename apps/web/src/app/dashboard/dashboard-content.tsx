"use client";

import { Suspense } from "react";
import { DashboardShell } from "./dashboard-shell";

function DashboardShellWrapper({
  user,
}: {
  user: { email?: string; user_metadata?: { name?: string; full_name?: string } };
}) {
  return (
    <DashboardShell user={user}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[...new Array(4)].map((_, i) => (
          <div
            key={"first-array" + i}
            className="h-20 w-full rounded-lg animate-pulse"
            style={{ backgroundColor: '#2a2a2a' }}
          />
        ))}
      </div>
      <div className="flex gap-2 flex-1">
        {[...new Array(2)].map((_, i) => (
          <div
            key={"second-array" + i}
            className="h-full w-full rounded-lg animate-pulse"
            style={{ backgroundColor: '#2a2a2a' }}
          />
        ))}
      </div>
    </DashboardShell>
  );
}

export function DashboardContent({
  user,
}: {
  user: { email?: string; user_metadata?: { name?: string; full_name?: string } };
}) {
  return (
    <Suspense fallback={
      <div className="flex w-full h-screen" style={{ backgroundColor: "#171717" }}>
        <div className="w-[48px] h-full border-r border-[#2e2e2e]" style={{ backgroundColor: '#1c1c1c' }} />
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[...new Array(4)].map((_, i) => (
              <div key={i} className="h-20 w-full rounded-lg animate-pulse" style={{ backgroundColor: '#2a2a2a' }} />
            ))}
          </div>
        </div>
      </div>
    }>
      <DashboardShellWrapper user={user} />
    </Suspense>
  );
}
