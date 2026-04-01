import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: "#171717" }}
    >
      <div className="text-center">
        <p className="text-[80px] font-bold text-[#2e2e2e]">404</p>
        <h1 className="text-[20px] font-semibold text-[#ededed] mt-2">
          Pagina no encontrada
        </h1>
        <p className="text-[14px] text-[#888] mt-2 mb-8">
          La pagina que buscas no existe o fue movida.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg px-6 py-3 text-[14px] font-semibold text-black"
          style={{ backgroundColor: "#3ecf8e" }}
        >
          Ir al Dashboard
        </Link>
      </div>
    </div>
  );
}
