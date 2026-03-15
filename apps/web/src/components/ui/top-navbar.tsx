"use client";

import { useState, useRef, useEffect } from "react";
import { Search, HelpCircle, Bell, ChevronDown, MessageSquare, LogOut, User, Settings } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function TopNavbar({
  tenantName,
  userName,
  projectName,
  plan,
}: {
  tenantName?: string;
  userName?: string;
  projectName?: string;
  plan?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="h-[48px] border-b border-[#2e2e2e] flex items-center justify-between px-4 flex-shrink-0" style={{ backgroundColor: '#1c1c1c' }}>
      <div className="flex items-center gap-3 text-[13px]">
        <Link href="/dashboard/org">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NodeLabz" width={18} height={18} className="flex-shrink-0 hover:opacity-80 transition-opacity" />
        </Link>
        <span className="text-[#444]">/</span>
        <Link href="/dashboard/org" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
          <span className="text-[#ededed] text-[13px]">{tenantName || "NodeLabz"}</span>
          <span className="text-[9px] px-[5px] py-[1px] rounded border border-[#444] text-[#888] font-medium uppercase tracking-widest">
            {plan || "Inicio"}
          </span>
          <ChevronDown size={12} className="text-[#666]" />
        </Link>
        {projectName && (
          <>
            <span className="text-[#444]">/</span>
            <Link href="/dashboard" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
              <span className="text-[#ededed] text-[13px]">{projectName}</span>
              <ChevronDown size={12} className="text-[#666]" />
            </Link>
          </>
        )}
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

        {/* Avatar with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-[28px] h-[28px] rounded-full flex items-center justify-center ml-1 hover:ring-2 hover:ring-[#444] transition-all"
            style={{ backgroundColor: '#333' }}
          >
            <span className="text-[10px] font-semibold text-[#ccc]">
              {userName?.charAt(0).toUpperCase() || "U"}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[36px] w-[200px] rounded-lg border border-[#2e2e2e] py-1 z-50 shadow-xl" style={{ backgroundColor: '#1c1c1c' }}>
              <div className="px-3 py-2 border-b border-[#2e2e2e]">
                <p className="text-[13px] text-[#ededed] font-medium">{userName || "Usuario"}</p>
                <p className="text-[11px] text-[#666]">{tenantName || "NodeLabz"}</p>
              </div>
              <Link
                href="/dashboard/org/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#999] hover:text-[#ededed] hover:bg-[#2a2a2a] transition-colors"
              >
                <User size={14} />
                Perfil
              </Link>
              <Link
                href="/dashboard/org/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#999] hover:text-[#ededed] hover:bg-[#2a2a2a] transition-colors"
              >
                <Settings size={14} />
                Configuracion
              </Link>
              <div className="border-t border-[#2e2e2e] mt-1 pt-1">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left text-[13px] text-[#999] hover:text-red-400 hover:bg-[#2a2a2a] transition-colors"
                >
                  <LogOut size={14} />
                  Cerrar sesion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
