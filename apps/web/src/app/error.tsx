"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#171717" }}
    >
      <div className="text-center max-w-md">
        <p className="text-[60px] font-bold text-[#2e2e2e]">500</p>
        <h1 className="text-[20px] font-semibold text-[#ededed] mt-2">
          Algo salio mal
        </h1>
        <p className="text-[14px] text-[#888] mt-2 mb-6">
          Ocurrio un error inesperado. Intenta de nuevo.
        </p>
        {error.message && (
          <p className="text-[12px] text-[#555] mb-6 font-mono px-4 py-2 rounded-lg border border-[#2e2e2e]" style={{ backgroundColor: "#1e1e1e" }}>
            {error.message}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-block rounded-lg px-6 py-3 text-[14px] font-semibold text-black"
          style={{ backgroundColor: "#3ecf8e" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
