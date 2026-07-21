// Compressed 3-4 page HTML/CSS report generator, styled per the InboundREM
// RealtyRank brand system (AI_Visibility_Audit.py / AI_Visibility_Audit_PDF_SOP.md).
//
// The input AuditData (lib/types.ts) is the rich, per-category schema the
// `realtyrank-json` skill actually outputs (see chris_hanway_audit.json).
// deriveCompressedView() below condenses that into the shorter view used by
// the page renderers, so the report itself stays a 3-4 page single-glance
// summary instead of the original 10-13 page format.

import type { AIQueryGroup, AuditData, Category, FAQ, Fix } from "@/lib/types";
import { tierColor, tierLabel } from "@/lib/utils";

function escapeHtml(str: string | number | undefined | null): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

// Minimal **bold** support so a summary/conclusion can emphasize a key phrase.
function richText(str: string | undefined | null): string {
  const escaped = escapeHtml(str);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

type Timeline = "Immediate" | "30 Days" | "60 Days";

const TIMELINE_COLOR: Record<Timeline, string> = {
  Immediate: "#FB7A00",
  "30 Days": "#F2A60C",
  "60 Days": "#8A92A0",
};

// ---------------------------------------------------------------------------
// Compressed view model + derivation from the rich AuditData
// ---------------------------------------------------------------------------

interface CompressedView {
  overall: number;
  client: string;
  contact: string;
  market: string;
  site: string;
  date: string;
  potentialRange: string;
  summary: string;
  categories: { name: string; score: number }[];
  keyStrengths: string[];
  mainIssues: { title: string; text: string }[];
  fixes: { n: number; fix: string; timeline: Timeline }[];
  coreAnswers: { q: string; a: string }[];
  queryGroups: { group: string; items: string[] }[];
  roadmap: { day30: string[]; day90: string[] };
  conclusionCurrent: number;
  conclusionProjected: string;
  conclusionText: string;
  conclusionRecommendation: string;
}

// The rich schema's prose (severeIssues, fix descriptions) runs long — cut it
// back to a punchy bullet at a word boundary so the compressed pages don't overflow.
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  const cut = str.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return base.trim().replace(/[.,;: —-]+$/, "") + "…";
}

// "No personal website exists — the single largest suppressor..." -> title/text
function splitIssue(issue: string): { title: string; text: string } {
  const dashIdx = issue.indexOf(" — ");
  if (dashIdx > 0 && dashIdx < 80) {
    return { title: issue.slice(0, dashIdx), text: truncate(issue.slice(dashIdx + 3).trim(), 100) };
  }
  const words = issue.split(" ");
  const title = words.slice(0, 6).join(" ");
  const rest = words.slice(6).join(" ");
  return { title, text: truncate(rest || issue, 100) };
}

// Fixes are already ordered by impact, so bucket them into rough timeframes.
function computeTimeline(index: number, total: number): Timeline {
  const third = total / 3;
  if (index < third) return "Immediate";
  if (index < third * 2) return "30 Days";
  return "60 Days";
}

function pickCoreAnswers(faqs: FAQ[]): { q: string; a: string }[] {
  const findByPattern = (re: RegExp) => faqs.find((f) => re.test(f.question));
  const picked = [findByPattern(/^who is/i), findByPattern(/brokerage/i), findByPattern(/areas?.*serve|serve.*areas?/i)].filter(
    (f): f is FAQ => Boolean(f)
  );
  const remaining = faqs.filter((f) => !picked.includes(f));
  return [...picked, ...remaining].slice(0, 3).map((f) => ({ q: f.question, a: truncate(f.answer, 210) }));
}

function deriveCompressedView(data: AuditData): CompressedView {
  const categories = safeArray(data.categories);
  const severeIssues = safeArray(data.severeIssues);
  const richFixes = safeArray(data.fixes);
  const faqs = safeArray(data.faqs);

  const fixes = richFixes.map((f: Fix, i) => ({
    n: f.number ?? i + 1,
    fix: truncate(f.description, 85),
    timeline: computeTimeline(i, richFixes.length),
  }));

  return {
    overall: data.overall ?? 0,
    client: data.client ?? "",
    contact: data.contact ?? "",
    market: data.market ?? "",
    site: data.site ?? "",
    date: data.date ?? "",
    potentialRange: data.conclusion?.projectedScore ?? "",
    summary: data.priorityIssue?.text ?? severeIssues[0] ?? "",
    categories: categories.map((c: Category) => ({ name: c.name, score: c.score })),
    keyStrengths: categories
      .flatMap((c: Category) => safeArray(c.strengths))
      .slice(0, 5)
      .map((s) => truncate(s, 115)),
    mainIssues: severeIssues.map(splitIssue),
    fixes,
    coreAnswers: pickCoreAnswers(faqs),
    queryGroups: safeArray(data.aiQueries).map((g: AIQueryGroup) => ({ group: g.group, items: safeArray(g.items) })),
    roadmap: {
      day30: fixes.filter((f) => f.timeline === "Immediate").map((f) => f.fix),
      day90: fixes.filter((f) => f.timeline !== "Immediate").map((f) => f.fix),
    },
    conclusionCurrent: data.conclusion?.currentScore ?? data.overall ?? 0,
    conclusionProjected: data.conclusion?.projectedScore ?? "",
    conclusionText: data.conclusion?.text ?? "",
    conclusionRecommendation: data.conclusion?.recommendation ?? "",
  };
}

// ---------------------------------------------------------------------------
// Donut SVG (ported from AI_Visibility_Audit.py's donut())
// ---------------------------------------------------------------------------

function donut(
  value: number | undefined | null,
  opts: { size?: number; sw?: number; fs?: number; subLabel?: string; track?: string } = {}
): string {
  const v = typeof value === "number" && !Number.isNaN(value) ? value : 0;
  const { size = 96, sw = 10, fs = 28, subLabel, track = "#EAEDF2" } = opts;
  const r = (size - sw) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const filled = (v / 100) * C;
  const gap = C - filled;
  const col = tierColor(v);
  const numY = subLabel ? cy + fs * 0.18 : cy + fs * 0.355;

  return `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="donut">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}"
      stroke-linecap="round" stroke-dasharray="${filled.toFixed(2)} ${gap.toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})" />
    <text x="${cx}" y="${numY}" text-anchor="middle" class="donut-num" style="font-size:${fs}px;fill:${col}">${Math.round(v)}</text>
    ${subLabel ? `<text x="${cx}" y="${cy + fs * 0.64}" text-anchor="middle" class="donut-sub" style="fill:${col}">${escapeHtml(subLabel)}</text>` : ""}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Shared chrome: masthead header + footer
// ---------------------------------------------------------------------------

function pageHeader(view: CompressedView, big: boolean): string {
  return `
  <div class="masthead">
    <div class="mh-eyebrow">INBOUNDREM &nbsp;|&nbsp; RealtyRank AI Visibility Audit</div>
    <div class="mh-row ${big ? "mh-row-lg" : ""}">
      <div class="mh-name">${escapeHtml(view.contact)} / ${escapeHtml(view.client)}</div>
      <div class="mh-meta">${escapeHtml(view.site)} &nbsp;|&nbsp; ${escapeHtml(view.date)}</div>
    </div>
  </div>
  <div class="mh-rule"></div>`;
}

function pageFooter(pageNum: number): string {
  return `<div class="pfoot"><span>Confidential &nbsp;|&nbsp; inboundrem.com</span><span>Page ${pageNum}</span></div>`;
}

function sectionBar(text: string): string {
  return `<div class="section-bar">${escapeHtml(text)}</div>`;
}

// Chromium's print pagination doesn't fragment flex containers reliably, so
// the page-break boundary lives on a plain block `.page`, with the flex
// column (used to pin the footer to the bottom) nested one level inside.
function pageWrap(pageNum: number, view: CompressedView, big: boolean, contentHtml: string): string {
  return `
  <section class="page">
    <div class="page-inner">
      ${pageHeader(view, big)}
      ${contentHtml}
      ${pageFooter(pageNum)}
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Page 1 — Cover + Scorecard
// ---------------------------------------------------------------------------

function renderPage1(view: CompressedView): string {
  const tier = tierLabel(view.overall);
  const col = tierColor(view.overall);

  const donuts = view.categories
    .map(
      (c) => `
      <div class="sc-cell">
        ${donut(c.score, { size: 108, sw: 10, fs: 30, track: "#262A33" })}
        <div class="sc-name">${escapeHtml(c.name)}</div>
      </div>`
    )
    .join("");

  const content = `
    <div class="score-card">
      <div class="score-ring">${donut(view.overall, { size: 170, sw: 15, fs: 46, subLabel: tier, track: "#262A33" })}</div>
      <div class="score-right">
        <div class="score-cap">Overall AI Visibility Score</div>
        <div class="score-big" style="color:${col}">${view.overall} / 100</div>
        <div class="score-sub">${escapeHtml(tier)} — ${escapeHtml(view.market)}</div>
        ${view.potentialRange ? `<div class="score-potential">Conservative potential after fixes: <strong>${escapeHtml(view.potentialRange)} / 100</strong></div>` : ""}
      </div>
    </div>

    <div class="summary-box">${richText(view.summary)}</div>

    <div class="scorecard-panel">
      ${sectionBar("Scorecard")}
      <div class="sc-grid" style="grid-template-columns:repeat(${Math.min(view.categories.length || 1, 3)},1fr)">${donuts}</div>
      <div class="tier-legend">
        <span style="color:#1BA85A">Strong &ge; 85</span>
        <span style="color:#F2A60C">Moderate 70&ndash;84</span>
        <span style="color:#E24A36">Weak 60&ndash;69</span>
        <span style="color:#C0392B">Critical &lt; 60</span>
      </div>
    </div>`;

  return pageWrap(1, view, true, content);
}

// ---------------------------------------------------------------------------
// Page 2 — Key Strengths & Main Issues + Highest-Priority Fixes
// ---------------------------------------------------------------------------

function renderPage2(view: CompressedView): string {
  const strengths = view.keyStrengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  const issues = view.mainIssues
    .map(
      (issue, i) => `
      <li>
        <div class="issue-title">${i + 1}. ${escapeHtml(issue.title)}</div>
        <div class="issue-text">${escapeHtml(issue.text)}</div>
      </li>`
    )
    .join("");

  const fixRows = view.fixes
    .map(
      (fix) => `
      <tr>
        <td class="fix-n">${escapeHtml(fix.n)}</td>
        <td class="fix-tx">${escapeHtml(fix.fix)}</td>
        <td class="fix-tl" style="color:${TIMELINE_COLOR[fix.timeline] ?? "inherit"}">${escapeHtml(fix.timeline)}</td>
      </tr>`
    )
    .join("");

  const content = `
    ${sectionBar("Key Strengths & Main Issues")}
    <div class="split">
      <div class="strengths-box">
        <div class="split-h strengths-h">Key Strengths</div>
        <ul class="strengths-list">${strengths}</ul>
      </div>
      <div class="issues-box">
        <div class="split-h issues-h">Main Issues</div>
        <ul class="issues-list">${issues}</ul>
      </div>
    </div>

    ${sectionBar("Highest-Priority Fixes")}
    <table class="fix-table">
      <thead><tr><th>#</th><th>Fix</th><th>Timeline</th></tr></thead>
      <tbody>${fixRows}</tbody>
    </table>`;

  return pageWrap(2, view, false, content);
}

// ---------------------------------------------------------------------------
// Page 3 — Recommended Core Answer Blocks + AI Query Opportunities / Roadmap
// ---------------------------------------------------------------------------

function renderPage3(view: CompressedView): string {
  const answers = view.coreAnswers
    .map(
      (a) => `
      <div class="answer-card">
        <div class="answer-q">${escapeHtml(a.q)}</div>
        <div class="answer-a">${escapeHtml(a.a)}</div>
      </div>`
    )
    .join("");

  const queryGroups = view.queryGroups
    .map(
      (g) => `
      <div class="query-group">
        <div class="query-group-h">${escapeHtml(g.group)}</div>
        <ul class="query-list">${g.items.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
      </div>`
    )
    .join("");

  const content = `
    ${sectionBar("Recommended Core Answer Blocks")}
    <div class="answer-grid">${answers}</div>

    ${sectionBar("AI Query Opportunities | 30- & 90-Day Roadmap")}
    <div class="roadmap-split">
      <div class="roadmap-col">
        <div class="roadmap-h">Best Query Opportunities</div>
        ${queryGroups}
      </div>
      <div class="roadmap-col">
        <div class="roadmap-h">Implementation Roadmap</div>
        <div class="focus-bar focus-30">30-Day Focus</div>
        <ul class="focus-list">${view.roadmap.day30.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        <div class="focus-bar focus-90">90-Day Focus</div>
        <ul class="focus-list">${view.roadmap.day90.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
      </div>
    </div>`;

  return pageWrap(3, view, false, content);
}

// ---------------------------------------------------------------------------
// Page 4 — Conclusion
// ---------------------------------------------------------------------------

function renderPage4(view: CompressedView): string {
  const nowCol = tierColor(view.conclusionCurrent);

  const content = `
    <div class="conc-card">
      <div class="conc-left">
        <div class="conc-eyebrow">Conclusion</div>
        <p class="conc-text">${richText(view.conclusionText)}</p>
        ${view.conclusionRecommendation ? `<p class="conc-owns"><strong>Recommendation:</strong> ${escapeHtml(view.conclusionRecommendation)}</p>` : ""}
      </div>
      <div class="conc-divider"></div>
      <div class="conc-right">
        <div class="conc-score"><div class="conc-label">Current</div><div class="conc-val" style="color:${nowCol}">${view.conclusionCurrent}</div></div>
        <div class="conc-score"><div class="conc-label">After fixes</div><div class="conc-val conc-projected">${escapeHtml(view.conclusionProjected)}</div></div>
        <div class="conc-of100">/100</div>
      </div>
    </div>`;

  return pageWrap(4, view, false, content);
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  :root {
    --hero: #0E0E11;
    --orange: #FB7A00;
    --amber: #FFA300;
    --ink: #14161F;
    --muted: #5C6470;
    --soft: #8A92A0;
    --line: #E7EAEF;
    --card: #F6F7F9;
  }

  @page { size: Letter; margin: 0.55in 0.6in; }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    color: var(--ink);
    font-size: 10pt;
  }

  .page {
    break-before: page;
  }
  .page:first-child { break-before: avoid; }
  .page-inner {
    min-height: 9.6in;
    display: flex;
    flex-direction: column;
  }

  /* Masthead */
  .mh-eyebrow { color: var(--orange); font-weight: 700; font-size: 8pt; letter-spacing: 0.5px; }
  .mh-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4px; }
  .mh-name { font-weight: 700; font-size: 10.5pt; }
  .mh-row-lg .mh-name { font-size: 17pt; font-weight: 800; letter-spacing: -0.3px; }
  .mh-meta { font-size: 9pt; color: var(--muted); }
  .mh-rule { height: 2px; background: var(--orange); margin: 8px 0 14px; }

  /* Footer */
  .pfoot {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: var(--soft);
    border-top: 1px solid var(--line);
    padding-top: 8px;
  }

  /* Section bar */
  .section-bar {
    background: var(--hero);
    color: #fff;
    font-weight: 700;
    font-size: 9.5pt;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    padding: 8px 14px;
    border-radius: 6px;
    margin: 14px 0 10px;
  }

  /* Page 1: score card */
  .score-card {
    background: var(--hero);
    border-radius: 14px;
    padding: 18px 22px;
    display: flex;
    align-items: center;
    gap: 22px;
  }
  .score-right { color: #fff; }
  .score-cap { font-size: 9pt; color: #A7AEBA; font-weight: 600; }
  .score-big { font-size: 26pt; font-weight: 800; margin-top: 2px; }
  .score-sub { font-size: 9.5pt; color: #C7CBD3; margin-top: 2px; }
  .score-potential { font-size: 9pt; color: var(--amber); margin-top: 8px; }
  .donut-num { font-weight: 800; }
  .donut-sub { font-size: 12px; font-weight: 700; }

  .summary-box {
    border-top: 2px solid var(--orange);
    border-bottom: 2px solid var(--orange);
    padding: 12px 2px;
    margin-top: 14px;
    font-size: 9.5pt;
    line-height: 1.55;
    color: #2A2E38;
  }

  .scorecard-panel {
    background: var(--hero);
    border-radius: 14px;
    padding: 16px 20px 12px;
    margin-top: 14px;
  }
  .scorecard-panel .section-bar { background: transparent; color: #fff; padding: 0 0 10px; margin: 0; }
  .sc-grid { display: grid; gap: 16px; }
  .sc-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .sc-cell .donut { display: block; }
  .sc-name { color: #C7CBD3; font-size: 8.5pt; font-weight: 600; text-align: center; }
  .tier-legend {
    display: flex;
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.12);
    font-size: 7.8pt;
    font-weight: 700;
  }
  .tier-legend span { flex: 1; text-align: center; border-left: 1px solid rgba(255,255,255,0.12); }
  .tier-legend span:first-child { border-left: none; }

  /* Page 2: strengths / issues */
  .split { display: flex; gap: 16px; }
  .strengths-box, .issues-box { flex: 1; border-radius: 12px; padding: 14px 16px; }
  .strengths-box { background: #EAF7F0; }
  .issues-box { background: #FDEDEB; }
  .split-h { font-weight: 700; font-size: 10.5pt; margin-bottom: 10px; }
  .strengths-h { color: #1BA85A; }
  .issues-h { color: #C0392B; }
  .strengths-list { list-style: none; margin: 0; padding: 0; font-size: 9pt; line-height: 1.5; }
  .strengths-list li { padding-left: 14px; position: relative; margin-bottom: 8px; }
  .strengths-list li::before { content: "\\2022"; position: absolute; left: 0; color: #1BA85A; font-weight: 800; }
  .issues-list { list-style: none; margin: 0; padding: 0; }
  .issues-list li { margin-bottom: 6px; }
  .issue-title { font-weight: 700; font-size: 8.6pt; color: #1F2937; }
  .issue-text { font-size: 8.2pt; color: #5A6472; line-height: 1.35; margin-top: 1px; }

  .fix-table { width: 100%; border-collapse: collapse; font-size: 8.3pt; margin-top: 4px; }
  .fix-table th { text-align: left; font-size: 7.2pt; text-transform: uppercase; letter-spacing: 0.4px; color: var(--muted); padding: 4px 8px; border-bottom: 2px solid var(--line); }
  .fix-table td { padding: 4px 8px; border-bottom: 1px solid var(--line); vertical-align: top; line-height: 1.3; }
  .fix-table tr:nth-child(even) td { background: var(--card); }
  .fix-n { font-weight: 700; color: var(--orange); width: 24px; }
  .fix-tl { font-weight: 700; white-space: nowrap; text-align: right; }

  /* Page 3: answer blocks */
  .answer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .answer-card { background: var(--card); border-radius: 10px; padding: 12px 14px; }
  .answer-q { color: var(--orange); font-weight: 700; font-size: 9pt; margin-bottom: 6px; }
  .answer-a { font-size: 8.3pt; line-height: 1.5; color: #3D4350; }

  .roadmap-split { display: flex; gap: 20px; }
  .roadmap-col { flex: 1; }
  .roadmap-h { font-weight: 700; font-size: 9.5pt; margin-bottom: 8px; }
  .query-group { margin-bottom: 12px; }
  .query-group-h { color: var(--orange); font-weight: 700; font-size: 7.8pt; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 5px; }
  .query-list, .focus-list { list-style: none; margin: 0; padding: 0; font-size: 8.5pt; line-height: 1.5; }
  .query-list li, .focus-list li { padding-left: 12px; position: relative; margin-bottom: 4px; color: #3D4350; }
  .query-list li::before, .focus-list li::before { content: "\\2022"; position: absolute; left: 0; color: var(--soft); }
  .focus-bar { color: #fff; font-weight: 700; font-size: 8.5pt; padding: 5px 10px; border-radius: 5px; margin: 10px 0 8px; }
  .focus-30 { background: var(--orange); }
  .focus-90 { background: var(--amber); }

  /* Page 4: conclusion */
  .conc-card {
    background: var(--hero);
    color: #fff;
    border-radius: 14px;
    padding: 20px 24px;
    display: flex;
    gap: 24px;
    margin-top: 8px;
  }
  .conc-left { flex: 1.6; }
  .conc-eyebrow { color: var(--orange); font-weight: 700; font-size: 9pt; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 8px; }
  .conc-text { font-size: 9.5pt; line-height: 1.6; color: #D7DAE2; margin: 0; }
  .conc-owns { font-size: 8.5pt; color: #B0B8C8; margin-top: 10px; line-height: 1.6; }
  .conc-divider { width: 1px; background: rgba(255,255,255,0.15); }
  .conc-right { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
  .conc-score { text-align: center; }
  .conc-label { font-size: 7.5pt; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.4px; }
  .conc-val { font-size: 22pt; font-weight: 800; color: var(--orange); }
  .conc-projected { color: #1BA85A; }
  .conc-of100 { font-size: 8pt; color: #9CA3AF; margin-top: -4px; }
`;

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------

export function renderAuditHTML(data: AuditData): string {
  const view = deriveCompressedView(data);
  const pages = [renderPage1(view), renderPage2(view), renderPage3(view), renderPage4(view)];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(view.client)} — AI Visibility Audit</title>
  <style>${CSS}</style>
</head>
<body>${pages.join("")}</body>
</html>`;
}
