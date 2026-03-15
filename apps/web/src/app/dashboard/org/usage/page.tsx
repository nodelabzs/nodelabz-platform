export default function UsagePage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Usage</h1>
      <p className="text-[14px] text-[#666] mb-8">Monitor your resource consumption</p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: '#1c1c1c' }}>
          <p className="text-[11px] text-[#666] uppercase tracking-wider mb-2">AI Calls</p>
          <p className="text-[24px] font-semibold text-[#ededed]">0 <span className="text-[13px] text-[#666] font-normal">/ 1,000</span></p>
          <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="h-full rounded-full w-0" style={{ backgroundColor: '#3ecf8e' }} />
          </div>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: '#1c1c1c' }}>
          <p className="text-[11px] text-[#666] uppercase tracking-wider mb-2">Emails Sent</p>
          <p className="text-[24px] font-semibold text-[#ededed]">0 <span className="text-[13px] text-[#666] font-normal">/ 5,000</span></p>
          <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="h-full rounded-full w-0" style={{ backgroundColor: '#3ecf8e' }} />
          </div>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: '#1c1c1c' }}>
          <p className="text-[11px] text-[#666] uppercase tracking-wider mb-2">Contacts</p>
          <p className="text-[24px] font-semibold text-[#ededed]">0 <span className="text-[13px] text-[#666] font-normal">/ 500</span></p>
          <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="h-full rounded-full w-0" style={{ backgroundColor: '#3ecf8e' }} />
          </div>
        </div>
        <div className="rounded-lg border border-[#2e2e2e] p-5" style={{ backgroundColor: '#1c1c1c' }}>
          <p className="text-[11px] text-[#666] uppercase tracking-wider mb-2">WhatsApp Messages</p>
          <p className="text-[24px] font-semibold text-[#ededed]">0 <span className="text-[13px] text-[#666] font-normal">/ 500</span></p>
          <div className="mt-3 h-1.5 rounded-full" style={{ backgroundColor: '#2a2a2a' }}>
            <div className="h-full rounded-full w-0" style={{ backgroundColor: '#3ecf8e' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
