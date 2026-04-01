"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Real Estate",
  "Marketing & Advertising",
  "Consulting",
  "Legal",
  "Hospitality",
  "Other",
];

const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-1000",
  "1001-5000",
  "5000+",
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
];

export default function OrgSettingsPage() {
  const { data: tenant, isLoading } = trpc.tenant.get.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [language, setLanguage] = useState("es");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setIndustry(tenant.industry || "");
      setCompanySize(tenant.companySize || "");
      setLanguage(tenant.language || "es");
    }
  }, [tenant]);

  const updateMutation = trpc.tenant.update.useMutation({
    onSuccess: () => {
      setFeedback({ type: "success", message: "Settings saved successfully" });
      utils.tenant.get.invalidate();
      utils.auth.getSession.invalidate();
      setTimeout(() => setFeedback(null), 3000);
    },
    onError: (err) => {
      setFeedback({ type: "error", message: err.message });
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ name, industry, companySize, language });
  };

  const handleCancel = () => {
    if (tenant) {
      setName(tenant.name || "");
      setIndustry(tenant.industry || "");
      setCompanySize(tenant.companySize || "");
      setLanguage(tenant.language || "es");
    }
    setFeedback(null);
  };

  const hasChanges =
    tenant &&
    (name !== (tenant.name || "") ||
      industry !== (tenant.industry || "") ||
      companySize !== (tenant.companySize || "") ||
      language !== (tenant.language || "es"));

  if (isLoading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Organization Settings</h1>
        <p className="text-[14px] text-[#666] mb-8">Loading...</p>
      </div>
    );
  }

  const selectClass =
    "h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#ededed] w-64 focus:outline-none focus:border-[#555] appearance-none cursor-pointer";

  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Organization Settings</h1>
      <p className="text-[14px] text-[#666] mb-8">General configuration, privacy, and lifecycle controls</p>

      {feedback && (
        <div
          className={`mb-4 px-4 py-3 rounded-md text-[13px] ${
            feedback.type === "success"
              ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30"
              : "bg-red-500/10 text-red-400 border border-red-500/30"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="rounded-lg border border-[#2e2e2e] p-6 mb-6" style={{ backgroundColor: "#1c1c1c" }}>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-6">Organization details</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#2e2e2e]">
            <label className="text-[13px] text-[#999]">Organization name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#ededed] w-64 focus:outline-none focus:border-[#555]"
              style={{ backgroundColor: "#222" }}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#2e2e2e]">
            <label className="text-[13px] text-[#999]">Organization slug</label>
            <input
              type="text"
              value={tenant?.slug || ""}
              className="h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#999] w-64 focus:outline-none focus:border-[#555]"
              style={{ backgroundColor: "#222" }}
              readOnly
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#2e2e2e]">
            <label className="text-[13px] text-[#999]">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={selectClass}
              style={{ backgroundColor: "#222" }}
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#2e2e2e]">
            <label className="text-[13px] text-[#999]">Company size</label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className={selectClass}
              style={{ backgroundColor: "#222" }}
            >
              <option value="">Select size</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} employees
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <label className="text-[13px] text-[#999]">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={selectClass}
              style={{ backgroundColor: "#222" }}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="h-9 px-4 rounded-md text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "#3ecf8e" }}
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-red-900/30 p-6" style={{ backgroundColor: "#1c1c1c" }}>
        <h3 className="text-[16px] font-medium text-red-400 mb-2">Danger Zone</h3>
        <p className="text-[13px] text-[#666] mb-4">
          Permanently delete this organization and all its data. This action cannot be undone.
        </p>
        <button className="h-9 px-4 rounded-md border border-red-800 text-[13px] text-red-400 hover:bg-red-900/20 transition-colors">
          Delete organization
        </button>
      </div>
    </div>
  );
}
