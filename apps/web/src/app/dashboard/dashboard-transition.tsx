"use client";

import { useState, useEffect } from "react";

export function DashboardTransition({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
  }, []);

  return (
    <div
      style={{
        transition: "opacity 700ms ease-out, filter 700ms ease-out",
        opacity: ready ? 1 : 0,
        filter: ready ? "blur(0px)" : "blur(12px)",
      }}
    >
      {children}
    </div>
  );
}
