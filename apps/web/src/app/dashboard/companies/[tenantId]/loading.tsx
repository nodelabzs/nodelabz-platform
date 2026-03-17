export default function CompanyLoading() {
  return (
    <div className="flex flex-col w-full h-screen overflow-hidden" style={{ backgroundColor: "#171717" }}>
      {/* TopNavbar skeleton */}
      <div className="h-[48px] border-b border-[#2e2e2e] flex items-center px-4" style={{ backgroundColor: "#1c1c1c" }}>
        <div className="flex items-center gap-3">
          <div className="w-[18px] h-[18px] rounded bg-[#333] animate-pulse" />
          <span className="text-[#444]">/</span>
          <div className="w-[80px] h-[16px] rounded bg-[#333] animate-pulse" />
          <span className="text-[#444]">/</span>
          <div className="w-[120px] h-[16px] rounded bg-[#333] animate-pulse" />
          <span className="text-[#444]">/</span>
          <div className="w-[100px] h-[16px] rounded bg-[#333] animate-pulse" />
        </div>
      </div>

      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Icon sidebar skeleton */}
        <div className="w-[48px] h-full border-r border-[#2e2e2e] flex flex-col items-center py-2 gap-1" style={{ backgroundColor: "#1c1c1c" }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-[38px] h-[38px] rounded-md bg-[#2a2a2a] animate-pulse" />
          ))}
        </div>

        {/* Detail sidebar skeleton */}
        <div className="w-[240px] h-full border-r border-[#2e2e2e] p-4" style={{ backgroundColor: "#1c1c1c" }}>
          <div className="w-[100px] h-[18px] rounded bg-[#333] animate-pulse mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-full h-[28px] rounded bg-[#2a2a2a] animate-pulse" />
            ))}
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 p-6">
          <div className="flex gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 flex-1 rounded-lg bg-[#222] animate-pulse" />
            ))}
          </div>
          <div className="flex gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-[300px] flex-1 rounded-lg bg-[#222] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
