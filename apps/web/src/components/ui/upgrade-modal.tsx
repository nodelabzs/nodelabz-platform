"use client";

import React from "react";
import { X, Lock, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const PLAN_DESCRIPTIONS: Record<string, string> = {
  CRECIMIENTO:
    "5,000 contactos, 25,000 emails/mes, workflows automatizados, IA Sonnet y mas.",
  PROFESIONAL:
    "25,000 contactos, 100,000 emails/mes, generacion de media IA, broadcasts, IA Opus y mas.",
  AGENCIA:
    "Contactos y emails ilimitados, todas las funciones, soporte prioritario.",
};

const PLAN_PRICE_LABELS: Record<string, string> = {
  CRECIMIENTO: "$79/mes",
  PROFESIONAL: "$199/mes",
  AGENCIA: "$399/mes",
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan: string;
  isTrialExpired?: boolean;
}

export function UpgradeModal({
  open,
  onClose,
  feature,
  requiredPlan,
  isTrialExpired,
}: UpgradeModalProps) {
  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess(data) {
      window.location.href = data.url;
    },
  });

  if (!open) return null;

  const description =
    PLAN_DESCRIPTIONS[requiredPlan] ?? "Todas las funciones premium incluidas.";
  const priceLabel = PLAN_PRICE_LABELS[requiredPlan] ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-[#2e2e2e] p-6 shadow-2xl"
        style={{ backgroundColor: "#171717" }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#666] hover:text-[#999] transition-colors"
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#3ecf8e]/10">
          <Lock size={22} className="text-[#3ecf8e]" />
        </div>

        {/* Trial expired warning */}
        {isTrialExpired && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-yellow-600/30 bg-yellow-900/20 px-3 py-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-500" />
            <p className="text-[13px] text-yellow-400">
              Tu periodo de prueba ha expirado. Suscribete para continuar usando
              la plataforma.
            </p>
          </div>
        )}

        {/* Title */}
        <h2 className="mb-1 text-lg font-semibold text-[#ededed]">
          Funcion no disponible
        </h2>
        <p className="mb-4 text-[14px] text-[#999]">
          <span className="capitalize">{feature.replace(/_/g, " ")}</span>{" "}
          requiere el plan{" "}
          <span className="font-medium text-[#3ecf8e]">{requiredPlan}</span>
          {priceLabel ? ` (${priceLabel})` : ""}.
        </p>

        {/* Plan description */}
        <div className="mb-6 rounded-lg border border-[#2e2e2e] bg-[#1c1c1c] px-4 py-3">
          <p className="text-[13px] font-medium text-[#ccc]">
            Plan {requiredPlan} incluye:
          </p>
          <p className="mt-1 text-[13px] text-[#888]">{description}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() =>
              createCheckout.mutate({
                plan: requiredPlan as "INICIO" | "CRECIMIENTO" | "PROFESIONAL" | "AGENCIA",
              })
            }
            disabled={createCheckout.isPending}
            className="flex-1 rounded-lg px-4 py-2.5 text-[14px] font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {createCheckout.isPending ? "Redirigiendo..." : "Ver planes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#2e2e2e] px-4 py-2.5 text-[14px] font-medium text-[#999] transition-colors hover:border-[#444] hover:text-[#ccc]"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
