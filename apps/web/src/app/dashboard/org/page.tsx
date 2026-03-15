import Link from "next/link";

export default function OrgPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-6">Projects</h1>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-[#333] text-[#888] text-[13px]" style={{ backgroundColor: 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <span>Search for a project</span>
        </div>
        <button className="h-9 px-3 rounded-md border border-[#333] text-[#888] text-[13px] hover:text-[#bbb] hover:border-[#555] transition-colors flex items-center gap-1.5">
          Status
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div className="flex-1" />
        <Link
          href="/dashboard"
          className="h-9 px-4 rounded-md text-[13px] font-medium text-white flex items-center gap-2 transition-colors" style={{ backgroundColor: '#3ecf8e' }}
        >
          <span>+</span>
          Open Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/dashboard" className="block rounded-lg border border-[#2e2e2e] p-5 hover:border-[#444] transition-colors" style={{ backgroundColor: '#1c1c1c' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[14px] font-medium text-[#ededed]">NodeLabz</h3>
            <button className="text-[#666] hover:text-[#999]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
          </div>
          <p className="text-[12px] text-[#666] mb-3">LATAM | us-east-2</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-[1px] rounded border text-[#3ecf8e] border-[#3ecf8e]/30 font-medium uppercase">Active</span>
            <span className="text-[10px] px-1.5 py-[1px] rounded border border-[#444] text-[#888] font-medium uppercase">Inicio</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
