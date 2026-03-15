// This will be replaced with actual router types once tRPC routers are defined
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

// Placeholder — will import from actual router
export type AppRouter = any;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
