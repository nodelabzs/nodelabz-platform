"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Loader from "@/components/ui/box-loader";

export default function AuthLoadingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "blur-out" | "done">("loading");
  const [attempts, setAttempts] = useState(0);

  const { data: session, isSuccess: sessionLoaded, refetch } = trpc.auth.getSession.useQuery(
    undefined,
    { retry: 3, retryDelay: 1000 }
  );

  useEffect(() => {
    if (!sessionLoaded) return;

    if (session?.user) {
      // User exists in DB — go to dashboard
      const t1 = setTimeout(() => setPhase("blur-out"), 1000);
      const t2 = setTimeout(() => {
        setPhase("done");
        router.replace("/dashboard/org");
      }, 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }

    // No DB user yet — could be new signup in progress
    if (attempts < 3) {
      const timer = setTimeout(() => {
        setAttempts((a) => a + 1);
        refetch();
      }, 1500);
      return () => clearTimeout(timer);
    }

    // After 3 retries, send to onboarding (user might need provisioning)
    router.replace("/onboarding");
  }, [sessionLoaded, session, router, attempts, refetch]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        transition: "opacity 1s ease-in-out, filter 1s ease-in-out, transform 1s ease-in-out",
        opacity: phase === "loading" ? 1 : 0,
        filter: phase === "loading" ? "blur(0px)" : "blur(24px)",
        transform: phase === "loading" ? "scale(1)" : "scale(1.05)",
      }}
    >
      <Loader />
    </div>
  );
}
