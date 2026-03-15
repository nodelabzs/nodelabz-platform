export default function OrgSettingsPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Organization Settings</h1>
      <p className="text-[14px] text-[#666] mb-8">General configuration, privacy, and lifecycle controls</p>

      <div className="rounded-lg border border-[#2e2e2e] p-6 mb-6" style={{ backgroundColor: '#1c1c1c' }}>
        <h3 className="text-[16px] font-medium text-[#ededed] mb-6">Organization details</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[#2e2e2e]">
            <label className="text-[13px] text-[#999]">Organization name</label>
            <input
              type="text"
              defaultValue="NodeLabz"
              className="h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#ededed] w-64 focus:outline-none focus:border-[#555]"
              style={{ backgroundColor: '#222' }}
            />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#2e2e2e]">
            <label className="text-[13px] text-[#999]">Organization slug</label>
            <input
              type="text"
              defaultValue="nodelabz"
              className="h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#999] w-64 focus:outline-none focus:border-[#555]"
              style={{ backgroundColor: '#222' }}
              readOnly
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <label className="text-[13px] text-[#999]">Industry</label>
            <input
              type="text"
              defaultValue="Technology"
              className="h-9 px-3 rounded-md border border-[#333] text-[13px] text-[#ededed] w-64 focus:outline-none focus:border-[#555]"
              style={{ backgroundColor: '#222' }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors">
            Cancel
          </button>
          <button className="h-9 px-4 rounded-md text-[13px] font-medium text-white" style={{ backgroundColor: '#3ecf8e' }}>
            Save
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-red-900/30 p-6" style={{ backgroundColor: '#1c1c1c' }}>
        <h3 className="text-[16px] font-medium text-red-400 mb-2">Danger Zone</h3>
        <p className="text-[13px] text-[#666] mb-4">Permanently delete this organization and all its data. This action cannot be undone.</p>
        <button className="h-9 px-4 rounded-md border border-red-800 text-[13px] text-red-400 hover:bg-red-900/20 transition-colors">
          Delete organization
        </button>
      </div>
    </div>
  );
}
