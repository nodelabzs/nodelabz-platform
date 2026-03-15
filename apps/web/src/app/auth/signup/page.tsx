import { SignUpForm } from "./signup-form";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            NodeLabz
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Crea tu cuenta y empieza tu prueba gratis de 7 dias
          </p>
        </div>
        <SignUpForm />
        <p className="text-center text-sm text-neutral-500">
          Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
            Inicia sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
