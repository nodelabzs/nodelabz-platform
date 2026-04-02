"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

export default function OAuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "plataforma";
  const error = searchParams.get("error");

  useEffect(() => {
    // If opened as popup (from onboarding), close it after a short delay
    if (window.opener) {
      const timer = setTimeout(() => {
        window.close();
      }, 1500);
      return () => clearTimeout(timer);
    }

    // If not a popup, redirect to dashboard
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#171717" }}
    >
      <div className="text-center">
        {error ? (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-[24px]">!</span>
            </div>
            <h1 className="text-[18px] font-semibold text-[#ededed] mb-2">Error de conexion</h1>
            <p className="text-[13px] text-[#888]">{decodeURIComponent(error)}</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-[#3ecf8e]" />
            </div>
            <h1 className="text-[18px] font-semibold text-[#ededed] mb-2">
              {platform} conectado
            </h1>
            <p className="text-[13px] text-[#888] mb-4">Puedes cerrar esta ventana</p>
            <Loader2 size={16} className="animate-spin text-[#555] mx-auto" />
          </>
        )}
      </div>
    </div>
  );
}
