"use client";

import { useMemo } from "react";
import { renderAuditHTML } from "@/lib/audit-renderer";
import type { AuditData } from "@/lib/types";

export default function AuditPreview({ data }: { data: AuditData }) {
  const html = useMemo(() => renderAuditHTML(data), [data]);

  return (
    <iframe
      title="Audit report preview"
      srcDoc={html}
      sandbox=""
      className="h-full w-full border-0"
    />
  );
}
