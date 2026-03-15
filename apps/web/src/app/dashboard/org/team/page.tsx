export default function TeamPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Team</h1>
      <p className="text-[14px] text-[#666] mb-8">Manage your team members and their permissions</p>

      <div className="rounded-lg border border-[#2e2e2e] overflow-hidden" style={{ backgroundColor: '#1c1c1c' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e2e]">
          <span className="text-[13px] text-[#999]">Members</span>
          <button className="h-8 px-3 rounded-md text-[13px] font-medium text-white" style={{ backgroundColor: '#3ecf8e' }}>
            Invite member
          </button>
        </div>
        <div className="divide-y divide-[#2e2e2e]">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#333' }}>
                <span className="text-[11px] font-semibold text-[#ccc]">F</span>
              </div>
              <div>
                <p className="text-[13px] text-[#ededed]">fedetafur@vt.edu</p>
                <p className="text-[11px] text-[#666]">Owner</p>
              </div>
            </div>
            <span className="text-[11px] px-2 py-[2px] rounded border border-[#444] text-[#888] uppercase tracking-wider">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
