export default function BillingPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Billing</h1>
      <p className="text-[14px] text-[#666] mb-8">Manage your subscription and payment methods</p>

      <div className="rounded-lg border border-[#2e2e2e] p-6 mb-6" style={{ backgroundColor: '#1c1c1c' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-medium text-[#ededed]">Current Plan</h3>
            <p className="text-[13px] text-[#666] mt-1">You are currently on the Inicio plan</p>
          </div>
          <button className="h-9 px-4 rounded-md border border-[#3ecf8e] text-[13px] font-medium text-[#3ecf8e] hover:bg-[#3ecf8e]/10 transition-colors">
            Upgrade
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="rounded-md border border-[#2e2e2e] p-4" style={{ backgroundColor: '#222' }}>
            <p className="text-[11px] text-[#666] uppercase tracking-wider mb-1">Plan</p>
            <p className="text-[18px] font-semibold text-[#ededed]">Inicio</p>
            <p className="text-[12px] text-[#666]">$39/mes</p>
          </div>
          <div className="rounded-md border border-[#2e2e2e] p-4" style={{ backgroundColor: '#222' }}>
            <p className="text-[11px] text-[#666] uppercase tracking-wider mb-1">Billing Period</p>
            <p className="text-[18px] font-semibold text-[#ededed]">Monthly</p>
            <p className="text-[12px] text-[#666]">Next: Apr 15, 2026</p>
          </div>
          <div className="rounded-md border border-[#2e2e2e] p-4" style={{ backgroundColor: '#222' }}>
            <p className="text-[11px] text-[#666] uppercase tracking-wider mb-1">Trial</p>
            <p className="text-[18px] font-semibold text-[#3ecf8e]">Active</p>
            <p className="text-[12px] text-[#666]">7 days remaining</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: '#1c1c1c' }}>
        <h3 className="text-[15px] font-medium text-[#ededed] mb-4">Payment Method</h3>
        <p className="text-[13px] text-[#666]">No payment method on file.</p>
        <button className="mt-4 h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors">
          Add payment method
        </button>
      </div>
    </div>
  );
}
