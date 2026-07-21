import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer from "puppeteer-core";
import { renderAuditHTML } from "@/lib/audit-renderer";
import type { AuditData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// @sparticuz/chromium-min doesn't bundle the Chromium binary — it must be
// fetched from a hosted pack (see CHROMIUM_PACK_URL) or, for local dev,
// point CHROME_EXECUTABLE_PATH at a local Chrome/Chromium install.
async function resolveExecutablePath(): Promise<string> {
  if (process.env.CHROME_EXECUTABLE_PATH) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }
  return chromium.executablePath(process.env.CHROMIUM_PACK_URL);
}

export async function POST(req: NextRequest) {
  const data: AuditData = await req.json();
  const html = renderAuditHTML(data);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await resolveExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    const filename = `${data.contact.replace(/\s+/g, "_")}_GEO_Audit.pdf`;
    return new NextResponse(new Blob([pdf], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await browser.close();
  }
}
