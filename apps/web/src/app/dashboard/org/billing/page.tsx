"use client";

import { trpc } from "@/lib/trpc";

const PLAN_DETAILS: Record<
  string,
  { name: string; price: string; contacts: string; emails: string; ai: string }
> = {
  INICIO: { name: "Inicio", price: "$39/mes", contacts: "500", emails: "5,000", ai: "Haiku" },
  CRECIMIENTO: { name: "Crecimiento", price: "$99/mes", contacts: "5,000", emails: "25,000", ai: "Sonnet" },
  PROFESIONAL: { name: "Profesional", price: "$249/mes", contacts: "25,000", emails: "100,000", ai: "Opus" },
  AGENCIA: { name: "Agencia", price: "$499/mes", contacts: "Unlimited", emails: "Unlimited", ai: "Opus" },
};

function UsageBar({ used, limit, unlimited }: { used: number; limit: number; unlimited: boolean }) {
  const pct = unlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#eab308" : "#3ecf8e";

  return (
    <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ backgroundColor: color, width: `${pct}%` }}
      />
    </div>
  );
}

export default function BillingPage() {
  const { data: subscription, isLoading: subLoading } = trpc.billing.getSubscription.useQuery();
  const { data: usage, isLoading: usageLoading } = trpc.billing.getUsage.useQuery();

  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const portal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });

  const isLoading = subLoading || usageLoading;
  const currentPlan = subscription?.plan || "INICIO";
  const planInfo = PLAN_DETAILS[currentPlan] ?? PLAN_DETAILS.INICIO!;

  const trialActive = subscription?.trialEndsAt && new Date(subscription.trialEndsAt) > new Date();
  const trialDays = subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formatDate = (d: Date | string | null) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatNumber = (n: number) => n.toLocaleString();

  if (isLoading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Billing</h1>
        <p className="text-[14px] text-[#666] mb-8">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Billing</h1>
      <p className="text-[14px] text-[#666] mb-8">Manage your subscription and payment methods</p>

      {/* Current Plan Card */}
      <div className="rounded-lg border border-[#2e2e2e] p-6 mb-6" style={{ backgroundColor: "#1c1c1c" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-medium text-[#ededed]">Current Plan</h3>
            <p className="text-[13px] text-[#666] mt-1">
              You are currently on the <span className="text-[#ededed]">{planInfo.name}</span> plan
            </p>
          </div>
          <div className="flex items-center gap-3">
            {subscription?.status !== "no_subscription" && (
              <button
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors disabled:opacity-50"
              >
                {portal.isPending ? "Loading..." : "Manage billing"}
              </button>
            )}
            {currentPlan !== "AGENCIA" && (
              <button
                onClick={() => {
                  const plans = ["INICIO", "CRECIMIENTO", "PROFESIONAL", "AGENCIA"] as const;
                  const currentIdx = plans.indexOf(currentPlan as (typeof plans)[number]);
                  const nextPlan = plans[currentIdx + 1];
                  if (nextPlan) checkout.mutate({ plan: nextPlan });
                }}
                disabled={checkout.isPending}
                className="h-9 px-4 rounded-md border border-[#3ecf8e] text-[13px] font-medium text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-colors disabled:opacity-50"
              >
                {checkout.isPending ? "Loading..." : "Upgrade"}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="rounded-md border border-[#2e2e2e] p-4" style={{ backgroundColor: "#222" }}>
            <p className="text-[11px] text-[#666] uppercase tracking-wider mb-1">Plan</p>
            <p className="text-[18px] font-semibold text-[#ededed]">{planInfo.name}</p>
            <p className="text-[12px] text-[#666]">{planInfo.price}</p>
          </div>
          <div className="rounded-md border border-[#2e2e2e] p-4" style={{ backgroundColor: "#222" }}>
            <p className="text-[11px] text-[#666] uppercase tracking-wider mb-1">Billing Period</p>
            <p className="text-[18px] font-semibold text-[#ededed]">Monthly</p>
            <p className="text-[12px] text-[#666]">
              Next: {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "N/A"}
            </p>
          </div>
          <div className="rounded-md border border-[#2e2e2e] p-4" style={{ backgroundColor: "#222" }}>
            <p className="text-[11px] text-[#666] uppercase tracking-wider mb-1">Trial</p>
            <p className={`text-[18px] font-semibold ${trialActive ? "text-[#3ecf8e]" : "text-[#666]"}`}>
              {trialActive ? "Active" : "Inactive"}
            </p>
            <p className="text-[12px] text-[#666]">
              {trialActive ? `${trialDays} day${trialDays !== 1 ? "s" : ""} remaining` : "Trial ended"}
            </p>
          </div>
        </div>
      </div>

      {/* Usage Summary */}
      {usage && (
        <div className="rounded-lg border border-[#2e2e2e] p-6 mb-6" style={{ backgroundColor: "#1c1c1c" }}>
          <h3 className="text-[15px] font-medium text-[#ededed] mb-4">Usage this period</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-[12px] text-[#999]">Contacts</p>
                <p className="text-[13px] text-[#ededed]">
                  {formatNumber(usage.contacts.used)}{" "}
                  <span className="text-[#666]">
                    / {usage.contacts.unlimited ? "Unlimited" : formatNumber(usage.contacts.limit)}
                  </span>
                </p>
              </div>
              <UsageBar used={usage.contacts.used} limit={usage.contacts.limit} unlimited={usage.contacts.unlimited} />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-[12px] text-[#999]">Emails</p>
                <p className="text-[13px] text-[#ededed]">
                  {formatNumber(usage.emails.used)}{" "}
                  <span className="text-[#666]">
                    / {usage.emails.unlimited ? "Unlimited" : formatNumber(usage.emails.limit)}
                  </span>
                </p>
              </div>
              <UsageBar used={usage.emails.used} limit={usage.emails.limit} unlimited={usage.emails.unlimited} />
            </div>
          </div>
        </div>
      )}

      {/* Plan Comparison */}
      <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: "#1c1c1c" }}>
        <h3 className="text-[15px] font-medium text-[#ededed] mb-4">Compare plans</h3>
        <div className="grid grid-cols-4 gap-3">
          {(["INICIO", "CRECIMIENTO", "PROFESIONAL", "AGENCIA"] as const).map((plan) => {
            const info = PLAN_DETAILS[plan]!;
            const isCurrent = plan === currentPlan;
            return (
              <div
                key={plan}
                className={`rounded-md border p-4 ${
                  isCurrent ? "border-[#3ecf8e]/50" : "border-[#2e2e2e]"
                }`}
                style={{ backgroundColor: "#222" }}
              >
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wider text-[#3ecf8e] font-semibold">
                    Current
                  </span>
                )}
                <p className="text-[15px] font-semibold text-[#ededed] mt-1">{info.name}</p>
                <p className="text-[13px] text-[#3ecf8e] font-medium mt-1">{info.price}</p>
                <div className="mt-3 space-y-2 text-[12px] text-[#999]">
                  <p>{info.contacts} contacts</p>
                  <p>{info.emails} emails/mo</p>
                  <p>AI: {info.ai}</p>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => checkout.mutate({ plan })}
                    disabled={checkout.isPending}
                    className="mt-4 w-full h-8 rounded-md border border-[#3ecf8e] text-[12px] font-medium text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-colors disabled:opacity-50"
                  >
                    {checkout.isPending ? "..." : "Select"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
