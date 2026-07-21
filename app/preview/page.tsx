"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import AuditPreview from "@/components/AuditPreview";
import { Button } from "@/components/ui/button";
import type { AuditData } from "@/lib/types";

const STORAGE_KEY = "realtyrank-audit-data";

function subscribe() {
  return () => {};
}

function getSnapshot(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

export default function PreviewPage() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const data = raw ? (JSON.parse(raw) as AuditData) : null;

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          No audit data to preview. Paste JSON and click &quot;Preview Report&quot; first.
        </p>
        <Button render={<Link href="/" />}>Back to input</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <Button variant="outline" size="sm" render={<Link href="/" />}>
          &larr; Back
        </Button>
      </div>
      <div className="flex-1">
        <AuditPreview data={data} />
      </div>
    </div>
  );
}
