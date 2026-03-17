import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";
import { generateReportPDF } from "@/server/reports/pdf-generator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dbUser = await findUserBySupabaseId(user.id);
  if (!dbUser) {
    return new Response("User not found", { status: 404 });
  }

  const tenantId = dbUser.tenantId;

  let body: { from?: string; to?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!body.from || !body.to) {
    return new Response("Missing 'from' and 'to' date fields", {
      status: 400,
    });
  }

  const from = new Date(body.from);
  const to = new Date(body.to);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return new Response("Invalid date format", { status: 400 });
  }

  try {
    const pdfBuffer = await generateReportPDF({
      tenantId,
      dateRange: { from, to },
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `reporte-${dateStr}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PDF generation failed:", message);
    return new Response("Failed to generate report", { status: 500 });
  }
}
