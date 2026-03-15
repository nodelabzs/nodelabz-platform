export default function OrgIntegrationsPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-[22px] font-semibold text-[#ededed] mb-2">Integrations</h1>
      <p className="text-[14px] text-[#666] mb-8">Connect third-party services to your organization</p>

      <div className="space-y-6">
        <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: '#1c1c1c' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[16px] font-medium text-[#ededed] mb-2">GitHub Connections</h3>
              <p className="text-[13px] text-[#666]">Connect your GitHub repositories for version control and CI/CD.</p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-[#2e2e2e] p-8 flex items-center justify-center" style={{ backgroundColor: '#222' }}>
            <button className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors">
              Add new connection
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-[#2e2e2e] p-6" style={{ backgroundColor: '#1c1c1c' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-[16px] font-medium text-[#ededed] mb-2">Vercel Integration</h3>
              <p className="text-[13px] text-[#666]">Deploy your NodeLabz customizations automatically.</p>
            </div>
          </div>
          <div className="mt-4">
            <button className="h-9 px-4 rounded-md border border-[#333] text-[13px] text-[#999] hover:text-[#ededed] hover:border-[#555] transition-colors flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Install Integration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
