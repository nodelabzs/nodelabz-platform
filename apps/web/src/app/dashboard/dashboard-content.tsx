"use client";

import { DashboardShell } from "./dashboard-shell";

export function DashboardContent({
  user,
}: {
  user: { email?: string; user_metadata?: { name?: string; full_name?: string } };
}) {
  return (
    <DashboardShell user={user}>
      <div className="flex gap-2">
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
