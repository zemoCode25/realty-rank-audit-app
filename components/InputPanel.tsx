"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { auditDataSchema, formatZodError } from "@/lib/schema";
import type { AuditData } from "@/lib/types";

const STORAGE_KEY = "realtyrank-audit-data";

function parseAuditData(raw: string): AuditData {
  const json = JSON.parse(raw);
  const result = auditDataSchema.safeParse(json);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }
  return result.data;
}

export default function InputPanel() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function validate(): AuditData | null {
    try {
      const data = parseAuditData(raw);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON.");
      return null;
    }
  }

  function handlePreview() {
    const data = validate();
    if (!data) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    router.push("/preview");
  }

  async function handleGeneratePDF() {
    const data = validate();
    if (!data) return;

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(`PDF generation failed (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.contact.replace(/\s+/g, "_")}_GEO_Audit.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste the audit JSON from the realtyrank-json skill here..."
          className="font-mono text-xs max-h-96 min-h-48 overflow-y-auto"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button variant="outline" onClick={validate}>
          Validate
        </Button>
        <Button variant="secondary" onClick={handlePreview} disabled>
          Preview Report
        </Button>
        <Button onClick={handleGeneratePDF} disabled={isGenerating}>
          {isGenerating ? "Generating…" : "Generate PDF"}
        </Button>
      </CardFooter>
    </Card>
  );
}
