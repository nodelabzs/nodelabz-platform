export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function getTenantSubdomain(host: string): string | null {
  const parts = host.split(".");
  if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "app") {
    return parts[0] ?? null;
  }
  return null;
}
