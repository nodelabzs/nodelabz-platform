"use client";

import { Search, HelpCircle, Bell, ChevronDown, MessageSquare } from "lucide-react";

export function TopNavbar({
  tenantName,
  userName,
}: {
  tenantName?: string;
  userName?: string;
}) {
  return (
    <header className="h-[48px] border-b border-[#2e2e2e] flex items-center justify-between px-4 flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
      <div className="flex items-center gap-3 text-[13px]">
        <a href="/dashboard/org">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NodeLabz" width={18} height={18} className="flex-shrink-0 hover:opacity-80 transition-opacity" />
        </a>
        <span className="text-[#444]">/</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[#ededed] text-[13px]">{tenantName || "NodeLabz"}</span>
          <span className="text-[9px] px-[5px] py-[1px] rounded border border-[#444] text-[#888] font-medium uppercase tracking-widest">
            Free
          </span>
          <ChevronDown size={12} className="text-[#666]" />
        </div>
        <span className="text-[#444]">/</span>
      </div>

      <div className="flex items-center gap-1.5">
        <button className="flex items-center gap-1.5 h-[32px] px-2.5 rounded-md border border-[#333] text-[#888] text-[13px] hover:text-[#bbb] hover:border-[#555] transition-colors" style={{ backgroundColor: 'transparent' }}>
          <Search size={14} />
          <span>Search...</span>
          <span className="text-[10px] text-[#555] ml-4">&#8984;K</span>
        </button>
        <button className="w-[32px] h-[32px] flex items-center justify-center rounded-md text-[#666] hover:text-[#999] hover:bg-[#2a2a2a] transition-colors">
          <MessageSquare size={16} />
        </button>
        <button className="w-[32px] h-[32px] flex items-center justify-center rounded-md text-[#666] hover:text-[#999] hover:bg-[#2a2a2a] transition-colors">
          <HelpCircle size={16} />
        </button>
        <button className="w-[32px] h-[32px] flex items-center justify-center rounded-md text-[#666] hover:text-[#999] hover:bg-[#2a2a2a] transition-colors">
          <Bell size={16} />
        </button>
        <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center ml-1" style={{ backgroundColor: '#333' }}>
          <span className="text-[10px] font-semibold text-[#ccc]">
            {userName?.charAt(0).toUpperCase() || "U"}
          </span>
        </div>
      </div>
    </header>
  );
}
