"use client";

import { trpc } from "@/lib/trpc";

function UsageCard({
  label,
  used,
  limit,
  unlimited,
}: {
  label: string;
  used: number;
  limit: number;
  unlimited: boolean;
}) {
  const pct = unlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct > 90 ? "#ef4444" : pct > 70 ? "#eab308" : "#3ecf8e";
  const formatNum = (n: number) => n.toLocaleString();

  return (
    <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: "#1c1c1c" }}>
      <p className="text-[11px] text-[#666] uppercase tracking-wider mb-2">{label}</p>
      <p className="text-[24px] font-semibold text-[#ededed]">
        {formatNum(used)}{" "}
        <span className="text-[13px] text-[#666] font-normal">
          / {unlimited ? "Unlimited" : formatNum(limit)}
        </span>
      </p>
      <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ backgroundColor: color, width: `${pct}%` }}
        />
      </div>
      {!unlimited && (
        <p className="mt-2 text-[11px] text-[#666]">
          {formatNum(Math.max(0, limit - used))} remaining ({(100 - pct).toFixed(1)}%)
        </p>
      )}
    </div>
  );
}

export default function UsagePage() {
  const { data: usage, isLoading } = trpc.billing.getUsage.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Usage</h1>
        <p className="text-[14px] text-[#666] mb-8">Loading...</p>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Usage</h1>
        <p className="text-[14px] text-[#666] mb-8">Unable to load usage data.</p>
      </div>
    );
  }

  const planLabel = usage.plan.charAt(0) + usage.plan.slice(1).toLowerCase();

  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Usage</h1>
      <p className="text-[14px] text-[#666] mb-8">
        Monitor your resource consumption on the{" "}
        <span className="text-[#ededed]">{planLabel}</span> plan
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <UsageCard
          label="Contacts"
          used={usage.contacts.used}
          limit={usage.contacts.limit}
          unlimited={usage.contacts.unlimited}
        />
        <UsageCard
          label="Emails Sent"
          used={usage.emails.used}
          limit={usage.emails.limit}
          unlimited={usage.emails.unlimited}
        />
      </div>

      <h3 className="text-[15px] font-medium text-[#ededed] mb-4">AI Generation</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <UsageCard
          label="AI Images"
          used={usage.aiImages.used}
          limit={usage.aiImages.limit}
          unlimited={usage.aiImages.unlimited}
        />
        <UsageCard
          label="AI Videos"
          used={usage.aiVideos.used}
          limit={usage.aiVideos.limit}
          unlimited={usage.aiVideos.unlimited}
        />
        <UsageCard
          label="AI Replies"
          used={usage.aiReplies.used}
          limit={usage.aiReplies.limit}
          unlimited={usage.aiReplies.unlimited}
        />
      </div>

      {/* Plan Limits */}
      <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: "#1c1c1c" }}>
        <h3 className="text-[15px] font-medium text-[#ededed] mb-4">Plan Limits & Features</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Max Contacts</span>
            <span className="text-[13px] text-[#ededed]">
              {usage.contacts.unlimited ? "Unlimited" : usage.contacts.limit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Max Emails / month</span>
            <span className="text-[13px] text-[#ededed]">
              {usage.emails.unlimited ? "Unlimited" : usage.emails.limit.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">AI Tier</span>
            <span className="text-[13px] text-[#ededed] capitalize">{usage.features.aiTier}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Media Generation</span>
            <span className={`text-[13px] ${usage.features.mediaGeneration ? "text-[#3ecf8e]" : "text-[#666]"}`}>
              {usage.features.mediaGeneration ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Save Workflows</span>
            <span className={`text-[13px] ${usage.features.canSaveWorkflows ? "text-[#3ecf8e]" : "text-[#666]"}`}>
              {usage.features.canSaveWorkflows ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Requires Approval</span>
            <span className="text-[13px] text-[#ededed]">
              {usage.features.requiresApproval ? "Yes" : "No"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Brand Editing</span>
            <span className={`text-[13px] ${usage.features.brandEditing ? "text-[#3ecf8e]" : "text-[#666]"}`}>
              {usage.features.brandEditing ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">4K Resolution</span>
            <span className={`text-[13px] ${usage.features.resolution4k ? "text-[#3ecf8e]" : "text-[#666]"}`}>
              {usage.features.resolution4k ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#2e2e2e]">
            <span className="text-[13px] text-[#999]">Image Quality</span>
            <span className="text-[13px] text-[#ededed] capitalize">{usage.features.imageQuality}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
