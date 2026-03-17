"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Loader from "@/components/ui/box-loader";

export default function AuthLoadingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"loading" | "blur-out" | "done">("loading");

  const { data: session, isSuccess: sessionLoaded } = trpc.auth.getSession.useQuery();

  useEffect(() => {
    if (!sessionLoaded) return;

    if (!session?.user) {
      router.replace("/auth/login");
      return;
    }

    const t1 = setTimeout(() => setPhase("blur-out"), 1600);
    const t2 = setTimeout(() => {
      setPhase("done");
      router.replace("/dashboard/org");
    }, 2400);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [sessionLoaded, session, router]);

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
