import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            NodeLabz
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Inicia sesión en tu cuenta
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
