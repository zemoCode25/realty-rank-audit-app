// TypeScript port of the Python/WeasyPrint HTML generator (AI_Visibility_Audit.py).
// Produces a single self-contained HTML document, styled for print/PDF via Puppeteer.

import type {
  AIQueryGroup,
  AuditData,
  Category,
  Conclusion,
  FAQ,
  Fix,
  PlanTier,
  PriorityIssue,
  PriorityPage,
} from "@/lib/types";
import { tierColor, tierLabel } from "@/lib/utils";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function tierGrade(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

// ---------------------------------------------------------------------------
// Icons (§10) — inline SVG paths, one per category
// ---------------------------------------------------------------------------

const ICONS: Record<Category["icon"], string> = {
  crawl: `<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>`,
  entity: `<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>`,
  trust: `<path d="M12 2L3 7v6c0 5 4 9.7 9 11 5-1.3 9-6 9-11V7z"/><polyline points="9,12 11,14 15,10"/>`,
  answer: `<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>`,
  local: `<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>`,
  media: `<circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/>`,
};

function icon(name: Category["icon"], size = 28): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// ---------------------------------------------------------------------------
// SVG chart math (§9)
// ---------------------------------------------------------------------------

function donut(value: number, size = 96, strokeWidth = 10, label?: string): string {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const filled = (value / 100) * C;
  const gap = C - filled;
  const color = tierColor(value);
  const fontSize = size * 0.28;
  const numY = label ? cy + fontSize * 0.18 : cy + fontSize * 0.355;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E5E7EB" stroke-width="${strokeWidth}" />
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
      stroke-dasharray="${filled} ${gap}" stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})" />
    <text x="${cx}" y="${numY}" text-anchor="middle" font-size="${fontSize}" font-weight="700" fill="#111827">${Math.round(value)}</text>
    ${label ? `<text x="${cx}" y="${cy + fontSize * 0.85}" text-anchor="middle" font-size="${fontSize * 0.32}" fill="#6B7280">${escapeHtml(label)}</text>` : ""}
  </svg>`;
}

function radar(categories: Category[], size = 480): string {
  const cx = size / 2;
  const cy = size / 2;
  const n = categories.length;
  const R = size / 2 - (n <= 5 ? 88 : 82);

  const pt = (i: number, frac: number): [number, number] => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + R * frac * Math.cos(ang), cy + R * frac * Math.sin(ang)];
  };

  const rings = [0.25, 0.5, 0.75, 1.0]
    .map((frac) => {
      const points = categories.map((_, i) => pt(i, frac).join(",")).join(" ");
      return `<polygon points="${points}" fill="none" stroke="#E5E7EB" stroke-width="1" />`;
    })
    .join("");

  const axes = categories
    .map((_, i) => {
      const [x, y] = pt(i, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#E5E7EB" stroke-width="1" />`;
    })
    .join("");

  const polygonPoints = categories.map((cat, i) => pt(i, cat.score / 100).join(",")).join(" ");

  const dots = categories
    .map((cat, i) => {
      const [x, y] = pt(i, cat.score / 100);
      return `<circle cx="${x}" cy="${y}" r="4" fill="${tierColor(cat.score)}" />`;
    })
    .join("");

  const labels = categories
    .map((cat, i) => {
      const [x, y] = pt(i, 1.24);
      const lines = cat.radarLabel.split("\n");
      const tspans = lines
        .map((line, li) => `<tspan x="${x}" dy="${li === 0 ? 0 : 14}">${escapeHtml(line)}</tspan>`)
        .join("");
      return `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="600" fill="#374151">${tspans}</text>`;
    })
    .join("");

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${rings}
    ${axes}
    <polygon points="${polygonPoints}" fill="#FB7A00" fill-opacity="0.18" stroke="#FB7A00" stroke-width="2" />
    ${dots}
    ${labels}
  </svg>`;
}

function hbar(label: string, score: number): string {
  const color = tierColor(score);
  return `
  <div class="hbar">
    <div class="hbar-label">${escapeHtml(label)}</div>
    <div class="hbar-track"><div class="hbar-fill" style="width:${score}%;background:${color}"></div></div>
    <div class="hbar-score" style="color:${color}">${score}</div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderCover(data: AuditData): string {
  const tier = data.overallTier ?? tierLabel(data.overall);
  return `
  <section class="page cover">
    <div class="cover-eyebrow">AI Visibility Audit</div>
    <div class="cover-ring">${donut(data.overall, 200, 16)}</div>
    <div class="cover-grade">Grade ${tierGrade(data.overall)} · ${escapeHtml(tier)}</div>
    <h1 class="cover-client">${escapeHtml(data.client)}</h1>
    <div class="cover-contact">${escapeHtml(data.contact)}</div>
    <div class="cover-meta">${escapeHtml(data.market)} &middot; ${escapeHtml(data.site)}</div>
    <div class="cover-date">${escapeHtml(data.date)}</div>
  </section>`;
}

function renderScorecard(data: AuditData): string {
  const bars = data.categories.map((cat) => hbar(`${cat.letter} · ${cat.name}`, cat.score)).join("");
  const donuts = data.categories
    .map(
      (cat) => `
      <div class="donut-cell">
        ${donut(cat.score, 96, 10)}
        <div class="donut-cell-label">${cat.letter} &middot; ${escapeHtml(cat.name)}</div>
      </div>`
    )
    .join("");

  return `
  <section class="page">
    <h2 class="section-title">Scorecard</h2>
    <div class="scorecard-grid">
      <div class="scorecard-radar">${radar(data.categories)}</div>
      <div class="scorecard-bars">${bars}</div>
    </div>
    <div class="donut-grid">${donuts}</div>
    ${pageFooter(data, "Scorecard")}
  </section>`;
}

function renderCategoryBlock(cat: Category): string {
  const color = tierColor(cat.score);
  return `
  <section class="page category-page">
    <div class="category-head">
      <div class="category-icon" style="color:${color}">${icon(cat.icon, 32)}</div>
      <div>
        <div class="category-letter">Category ${cat.letter}</div>
        <h2 class="category-name">${escapeHtml(cat.name)}</h2>
      </div>
      <div class="category-score">${donut(cat.score, 84, 9)}</div>
      <div class="tier-badge" style="background:${color}">${escapeHtml(tierLabel(cat.score))}</div>
    </div>
    <p class="category-lead">${escapeHtml(cat.lead)}</p>
    <div class="category-columns">
      <div class="category-col">
        <h3 class="col-title strengths">Working</h3>
        <ul>${cat.strengths.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>
      <div class="category-col">
        <h3 class="col-title problems">Problems</h3>
        <ul>${cat.problems.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>
      <div class="category-col">
        <h3 class="col-title fixes">Fixes</h3>
        <ul>${cat.fixes.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
      </div>
    </div>
  </section>`;
}

function renderPriorityIssue(issue: PriorityIssue): string {
  return `
  <section class="page priority-page">
    <h2 class="section-title on-dark">Priority Issue</h2>
    <p class="priority-text">${escapeHtml(issue.text)}</p>
    <div class="chain">${escapeHtml(issue.chain)}</div>
  </section>`;
}

function renderActionPlan(data: AuditData): string {
  const issues = data.severeIssues
    .map((issue, i) => `<li><span class="badge-num">${i + 1}</span>${escapeHtml(issue)}</li>`)
    .join("");

  const tiers = data.actionPlan
    .map(
      (tier: PlanTier) => `
      <div class="plan-tier" style="border-top-color:${tier.color}">
        <div class="plan-tier-head">
          <span class="plan-tier-name">${escapeHtml(tier.name)}</span>
          <span class="plan-tier-tag" style="background:${tier.color}">${escapeHtml(tier.tag)}</span>
        </div>
        <ul>${tier.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>`
    )
    .join("");

  return `
  <section class="page">
    <h2 class="section-title">Action Plan</h2>
    <h3 class="subsection-title">Severe Issues</h3>
    <ul class="severe-issues">${issues}</ul>
    <div class="plan-grid">${tiers}</div>
    <div class="cta-banner">Ready to close these gaps? Start with the Top Tier fixes above.</div>
  </section>`;
}

function renderFAQs(faqs: FAQ[]): string {
  const items = faqs
    .map(
      (faq) => `
      <div class="faq-item">
        <div class="faq-question">${escapeHtml(faq.question)}</div>
        <div class="faq-answer">${escapeHtml(faq.answer)}</div>
      </div>`
    )
    .join("");

  return `
  <section class="page">
    <h2 class="section-title">Frequently Asked Questions</h2>
    <div class="faq-grid">${items}</div>
  </section>`;
}

function renderPriorityPages(pages: PriorityPage[]): string {
  const rows = pages
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.page)}</td>
        <td>${escapeHtml(p.purpose)}</td>
        <td><span class="priority-pill priority-${(p.priority ?? "Medium").toLowerCase()}">${escapeHtml(p.priority ?? "Medium")}</span></td>
      </tr>`
    )
    .join("");

  return `
  <table class="pages-table">
    <thead><tr><th>Page</th><th>Purpose</th><th>Priority</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderAIQueries(queries: AIQueryGroup[]): string {
  return queries
    .map(
      (group) => `
      <div class="query-group">
        <h3 class="query-group-title">${escapeHtml(group.group)}</h3>
        <div class="query-pills">${group.items.map((q) => `<span class="query-pill">${escapeHtml(q)}</span>`).join("")}</div>
      </div>`
    )
    .join("");
}

function renderPagesAndQueries(data: AuditData): string {
  return `
  <section class="page">
    <h2 class="section-title">Target Pages &amp; Queries</h2>
    ${data.priorityPages?.length ? renderPriorityPages(data.priorityPages) : ""}
    ${data.aiQueries?.length ? `<div class="queries-col">${renderAIQueries(data.aiQueries)}</div>` : ""}
  </section>`;
}

function renderFixList(fixes: Fix[]): string {
  const rows = fixes
    .map(
      (fix) => `
      <tr>
        <td class="fix-num">${fix.number}</td>
        <td>${escapeHtml(fix.description)}</td>
        <td class="fix-lift">${escapeHtml(fix.scoreLift)}</td>
        <td><span class="difficulty-badge difficulty-${fix.difficulty.toLowerCase()}">${escapeHtml(fix.difficulty)}</span></td>
      </tr>`
    )
    .join("");

  return `
  <section class="page">
    <h2 class="section-title">Fix List</h2>
    <table class="fix-table">
      <thead><tr><th>#</th><th>Description</th><th>Score Lift</th><th>Difficulty</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function renderConclusion(conclusion: Conclusion): string {
  return `
  <section class="page conclusion-page">
    <h2 class="section-title on-dark">Conclusion</h2>
    <div class="score-progression">
      <div class="score-box">${conclusion.currentScore}<span>Current</span></div>
      <div class="score-arrow">&rarr;</div>
      <div class="score-box projected">${escapeHtml(conclusion.projectedScore)}<span>Projected</span></div>
    </div>
    <p class="conclusion-text">${escapeHtml(conclusion.text)}</p>
    <p class="conclusion-recommendation"><strong>Recommendation:</strong> ${escapeHtml(conclusion.recommendation)}</p>
    <div class="chain">${escapeHtml(conclusion.chain)}</div>
  </section>`;
}

function pageFooter(data: AuditData, section: string): string {
  return `<div class="page-footer"><span>${escapeHtml(data.client)}</span><span>${escapeHtml(section)}</span></div>`;
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
  }

  @page { size: Letter; margin: 0.7in 0.65in; }
  @page cover { margin: 0; }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
    color: #1F2937;
    font-size: 13px;
  }

  .page {
    break-before: page;
    min-height: 9.6in;
    display: flex;
    flex-direction: column;
  }
  .page:first-child { break-before: avoid; }

  .page-footer {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #9CA3AF;
    border-top: 1px solid #E5E7EB;
    padding-top: 8px;
  }

  .section-title {
    font-size: 22px;
    font-weight: 800;
    margin: 0 0 16px;
  }
  .subsection-title { font-size: 15px; font-weight: 700; margin: 8px 0; }
  .on-dark { color: #fff; }

  /* Cover */
  .cover {
    page: cover;
    break-before: avoid;
    min-height: 11in;
    background: var(--hero);
    color: #fff;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
    padding: 0 1in;
  }
  .cover-eyebrow { letter-spacing: 0.2em; text-transform: uppercase; font-size: 12px; color: var(--amber); font-weight: 700; }
  .cover-ring { margin: 12px 0; }
  .cover-grade { font-size: 14px; font-weight: 600; color: var(--amber); }
  .cover-client { font-size: 34px; font-weight: 800; margin: 4px 0; }
  .cover-contact { font-size: 16px; color: #D1D5DB; }
  .cover-meta { font-size: 13px; color: #9CA3AF; margin-top: 8px; }
  .cover-date { font-size: 11px; color: #6B7280; margin-top: 4px; }

  /* Scorecard */
  .scorecard-grid { display: flex; gap: 24px; align-items: center; }
  .scorecard-radar { flex-shrink: 0; }
  .scorecard-bars { flex: 1; display: flex; flex-direction: column; gap: 10px; }
  .hbar { display: flex; align-items: center; gap: 10px; }
  .hbar-label { width: 150px; font-size: 12px; font-weight: 600; }
  .hbar-track { flex: 1; height: 10px; background: #F3F4F6; border-radius: 6px; overflow: hidden; }
  .hbar-fill { height: 100%; border-radius: 6px; }
  .hbar-score { width: 28px; text-align: right; font-weight: 700; font-size: 12px; }

  .donut-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 28px; }
  .donut-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .donut-cell-label { font-size: 11px; font-weight: 600; text-align: center; color: #4B5563; }

  /* Category pages */
  .category-head { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .category-letter { font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
  .category-name { font-size: 22px; font-weight: 800; margin: 2px 0 0; }
  .category-score { margin-left: auto; }
  .tier-badge { color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
  .category-lead { font-size: 14px; color: #374151; margin: 8px 0 20px; }
  .category-columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .col-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
  .col-title.strengths { color: #1BA85A; }
  .col-title.problems { color: #E24A36; }
  .col-title.fixes { color: var(--orange); }
  .category-columns ul { margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.5; }
  .category-columns li { margin-bottom: 6px; }

  /* Priority issue */
  .priority-page { background: var(--hero); color: #fff; justify-content: center; padding: 0.4in 0.2in; }
  .priority-text { font-size: 16px; line-height: 1.6; color: #E5E7EB; }
  .chain { color: var(--amber); font-size: 12px; font-weight: 600; margin-top: 16px; }

  /* Action plan */
  .severe-issues { list-style: none; margin: 0 0 24px; padding: 0; }
  .severe-issues li { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; margin-bottom: 8px; }
  .badge-num { flex-shrink: 0; width: 20px; height: 20px; border-radius: 999px; background: var(--orange); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .plan-tier { border-top: 4px solid; padding-top: 10px; }
  .plan-tier-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .plan-tier-name { font-weight: 700; font-size: 13px; }
  .plan-tier-tag { color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .plan-tier ul { margin: 0; padding-left: 16px; font-size: 12px; line-height: 1.5; }
  .cta-banner { margin-top: 28px; background: var(--hero); color: #fff; text-align: center; padding: 14px; border-radius: 10px; font-weight: 700; font-size: 13px; }

  /* FAQ */
  .faq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .faq-question { color: var(--orange); font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .faq-answer { font-size: 12px; line-height: 1.5; color: #374151; }

  /* Pages + queries */
  .pages-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
  .pages-table th { text-align: left; font-size: 10px; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; border-bottom: 2px solid #E5E7EB; }
  .pages-table td { padding: 6px 8px; border-bottom: 1px solid #F3F4F6; }
  .priority-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
  .priority-high { background: #FEE2E2; color: #C0392B; }
  .priority-medium { background: #FEF3C7; color: #92400E; }
  .query-group { margin-bottom: 16px; }
  .query-group-title { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
  .query-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .query-pill { font-size: 11px; background: #F3F4F6; color: #374151; padding: 4px 10px; border-radius: 999px; }

  /* Fix list */
  .fix-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .fix-table th { text-align: left; font-size: 10px; text-transform: uppercase; color: #9CA3AF; padding: 4px 8px; border-bottom: 2px solid #E5E7EB; }
  .fix-table td { padding: 8px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  .fix-num { font-weight: 700; color: var(--orange); }
  .fix-lift { font-weight: 700; white-space: nowrap; }
  .difficulty-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
  .difficulty-specialist { background: #FEE2E2; color: #991B1B; }
  .difficulty-medium { background: #FEF3C7; color: #92400E; }
  .difficulty-agent { background: #DBEAFE; color: #1E40AF; }

  /* Conclusion */
  .conclusion-page { background: var(--hero); color: #fff; }
  .score-progression { display: flex; align-items: center; gap: 20px; margin: 16px 0 24px; }
  .score-box { display: flex; flex-direction: column; align-items: center; font-size: 32px; font-weight: 800; }
  .score-box span { font-size: 11px; font-weight: 500; color: #9CA3AF; margin-top: 4px; }
  .score-box.projected { color: var(--amber); }
  .score-arrow { font-size: 24px; color: var(--amber); }
  .conclusion-text { font-size: 14px; line-height: 1.6; color: #E5E7EB; }
  .conclusion-recommendation { font-size: 13px; color: #fff; }
`;

// ---------------------------------------------------------------------------
// Main assembler
// ---------------------------------------------------------------------------

export function renderAuditHTML(data: AuditData): string {
  const sections = [
    renderCover(data),
    renderScorecard(data),
    ...data.categories.map((cat) => renderCategoryBlock(cat)),
    data.priorityIssue ? renderPriorityIssue(data.priorityIssue) : "",
    renderActionPlan(data),
    data.faqs?.length ? renderFAQs(data.faqs) : "",
    data.priorityPages?.length || data.aiQueries?.length ? renderPagesAndQueries(data) : "",
    data.fixes?.length ? renderFixList(data.fixes) : "",
    data.conclusion ? renderConclusion(data.conclusion) : "",
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.client)} — AI Visibility Audit</title>
  <style>${CSS}</style>
</head>
<body>${sections.join("")}</body>
</html>`;
}
