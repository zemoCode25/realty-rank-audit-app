# InboundREM — RealtyRank Audit App: Project Brief

**For transfer to Claude Code / VS Code**
**Date:** July 21, 2026
**Owner:** Robert — marketingteam@inboundrem.com

---

## 1. What We're Building

A Next.js web app that replaces the manual PDF audit workflow. The user pastes audit JSON (produced by a Claude skill) into a form, clicks Generate, and receives a branded multi-page PDF report identical to what the current Python/WeasyPrint system produces.

**The old flow:**

> Claude researches a realtor → Python script builds HTML → WeasyPrint renders PDF → manual delivery

**The new flow:**

> User pastes URL into Claude (using the `realtyrank-json` skill) → Claude outputs JSON → User pastes JSON into this app → clicks Generate PDF → downloads branded report

---

## 2. Tech Stack

```
Next.js 14+ (App Router)
TypeScript
Tailwind CSS
shadcn/ui
Puppeteer (server-side PDF generation via API route)
```

**For Vercel deployment:** swap `puppeteer` for `puppeteer-core` + `@sparticuz/chromium-min`
**For local/self-hosted:** use standard `puppeteer`

**Install commands (run in your project folder):**

```bash
npx create-next-app@latest audit-app --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd audit-app
npx shadcn@latest init
npx shadcn@latest add button textarea card tabs label input
npm install puppeteer
```

---

## 3. Project File Structure

```
audit-app/
├── app/
│   ├── page.tsx                    # Main input page (JSON paste + form tabs)
│   ├── preview/
│   │   └── page.tsx                # Live HTML preview of the report
│   └── api/
│       └── generate-pdf/
│           └── route.ts            # Puppeteer PDF endpoint (POST)
├── components/
│   ├── InputPanel.tsx              # JSON textarea + form input panel
│   └── AuditPreview.tsx            # Renders the audit HTML for preview
├── lib/
│   ├── types.ts                    # TypeScript interfaces (already written — see §6)
│   ├── audit-renderer.ts           # Full TypeScript port of Python HTML generator
│   └── utils.ts                    # Tier color helpers, score utils
└── public/
    └── fonts/                      # Inter font files (woff2)
```

---

## 4. User Flow

1. User lands on `/` — sees two tabs: **Paste JSON** and **Fill Form**
2. **Paste JSON tab:** textarea where they paste the raw JSON from the Claude skill
3. **Fill Form tab:** structured form fields matching the JSON schema (optional, for manual entry)
4. Click **"Preview Report"** → renders the HTML report in a preview panel or new tab
5. Click **"Generate PDF"** → POST to `/api/generate-pdf` → Puppeteer renders HTML → returns PDF download

---

## 5. Brand Palette (Do Not Change)

| Token      | Hex       | Usage                                         |
| ---------- | --------- | --------------------------------------------- |
| `--hero`   | `#0E0E11` | Cover background, dark boxes, conclusion card |
| `--orange` | `#FB7A00` | Primary accent, CTA, fix number badges        |
| `--amber`  | `#FFA300` | Secondary accent                              |
| Strong     | `#1BA85A` | Scores ≥ 85                                   |
| Moderate   | `#F2A60C` | Scores 70–84                                  |
| Weak       | `#E24A36` | Scores 60–69                                  |
| Critical   | `#C0392B` | Scores < 60                                   |

**Tier thresholds (locked):**

```
≥ 85  → Strong    #1BA85A
70–84 → Moderate  #F2A60C
60–69 → Weak      #E24A36
< 60  → Critical  #C0392B
```

---

## 6. TypeScript Types (`lib/types.ts`)

This file is already written. Here it is in full:

```typescript
// InboundREM RealtyRank — Audit Data Types
// Matches the canonical JSON schema v2.0

export interface Category {
  letter: string; // "A" – "F"
  name: string; // "AI Crawlability"
  score: number; // 0–100
  icon: "crawl" | "entity" | "trust" | "answer" | "local" | "media";
  radarLabel: string; // "AI\nCrawlability"
  lead: string; // one-sentence summary
  strengths: string[]; // 2–3 bullets
  problems: string[]; // 2–3 bullets
  fixes: string[]; // 3 bullets
}

export interface PlanTier {
  name: string; // "Top Tier"
  tag: string; // "Immediate"
  color: string; // hex
  items: string[]; // exactly 3
}

export interface PriorityIssue {
  title: string;
  text: string;
  chain: string; // "Agent → Brand → … → site.com → Spec · Spec"
}

export interface FAQ {
  question: string;
  answer: string; // 40–80 words
}

export interface PriorityPage {
  page: string;
  purpose: string;
  priority?: "High" | "Medium";
}

export interface AIQueryGroup {
  group: string; // "Branded" | "Local" | "Service & Niche"
  items: string[];
}

export interface Fix {
  number: number;
  description: string;
  scoreLift: string; // "+3 to +5"
  difficulty: "Specialist" | "Medium" | "Agent";
}

export interface Conclusion {
  currentScore: number;
  projectedScore: string; // "88–92"
  text: string;
  recommendation: string;
  chain: string;
}

export interface AuditData {
  overall: number;
  client: string;
  contact: string;
  market: string;
  site: string;
  date: string;
  overallTier?: string;
  categories: Category[];
  severeIssues: string[]; // exactly 5
  actionPlan: PlanTier[]; // exactly 3
  priorityIssue?: PriorityIssue | null;
  faqs?: FAQ[]; // 6–9
  priorityPages?: PriorityPage[]; // 8–14
  aiQueries?: AIQueryGroup[]; // 3+ groups
  fixes?: Fix[]; // 7–10
  conclusion?: Conclusion | null;
}
```

---

## 7. Canonical JSON Schema (v2.0)

This is the format the Claude skill outputs and the app consumes. Full example:

```json
{
  "overall": 83,
  "client": "Homes of Fort Bend",
  "contact": "Bret Wallace",
  "market": "Fort Bend County, Texas",
  "site": "homesoffortbend.com",
  "date": "June 12, 2026",
  "overallTier": "Moderate",

  "categories": [
    {
      "letter": "A",
      "name": "AI Crawlability",
      "score": 78,
      "icon": "crawl",
      "radarLabel": "AI\nCrawlability",
      "lead": "One sentence summary of this category's status.",
      "strengths": ["Working item 1", "Working item 2"],
      "problems": ["Problem 1", "Problem 2"],
      "fixes": ["Critical fix 1", "Critical fix 2", "Critical fix 3"]
    },
    {
      "letter": "B",
      "name": "Entity & Knowledge Graph",
      "score": 88,
      "icon": "entity",
      "radarLabel": "Entity &\nGraph",
      "lead": "...",
      "strengths": ["..."],
      "problems": ["..."],
      "fixes": ["..."]
    },
    {
      "letter": "C",
      "name": "Trust / Citations",
      "score": 84,
      "icon": "trust",
      "radarLabel": "Trust /\nCitations",
      "lead": "...",
      "strengths": ["..."],
      "problems": ["..."],
      "fixes": ["..."]
    },
    {
      "letter": "D",
      "name": "Answerability",
      "score": 79,
      "icon": "answer",
      "radarLabel": "Answer-\nability",
      "lead": "...",
      "strengths": ["..."],
      "problems": ["..."],
      "fixes": ["..."]
    },
    {
      "letter": "E",
      "name": "Hyperlocal Authority",
      "score": 86,
      "icon": "local",
      "radarLabel": "Hyperlocal\nAuthority",
      "lead": "...",
      "strengths": ["..."],
      "problems": ["..."],
      "fixes": ["..."]
    },
    {
      "letter": "F",
      "name": "Multimodal & Media",
      "score": 75,
      "icon": "media",
      "radarLabel": "Multi-\nmodal",
      "lead": "...",
      "strengths": ["..."],
      "problems": ["..."],
      "fixes": ["..."]
    }
  ],

  "severeIssues": ["Issue 1", "Issue 2", "Issue 3", "Issue 4", "Issue 5"],

  "actionPlan": [
    {
      "name": "Top Tier",
      "tag": "Immediate",
      "color": "#FB7A00",
      "items": ["Fix 1", "Fix 2", "Fix 3"]
    },
    {
      "name": "Mid Tier",
      "tag": "Next 30–60 days",
      "color": "#F7B500",
      "items": ["Fix 1", "Fix 2", "Fix 3"]
    },
    {
      "name": "Lower Tier",
      "tag": "Ongoing cleanup",
      "color": "#9AA0AC",
      "items": ["Fix 1", "Fix 2", "Fix 3"]
    }
  ],

  "priorityIssue": {
    "title": "Short title (not displayed)",
    "text": "2–3 sentence narrative under 60 words.",
    "chain": "Agent → Brand → Brokerage → Market → site.com → Specialty 1 · Specialty 2"
  },

  "faqs": [{ "question": "Who is [Agent]?", "answer": "40–80 word answer." }],

  "priorityPages": [
    {
      "page": "Sugar Land Realtor Page",
      "purpose": "Core local buyer/seller demand",
      "priority": "High"
    }
  ],

  "aiQueries": [
    { "group": "Branded", "items": ["Who is Agent?", "Agent reviews"] },
    { "group": "Local", "items": ["Best Realtor in City TX"] },
    {
      "group": "Service & Niche",
      "items": ["City listing agent", "City relocation Realtor"]
    }
  ],

  "fixes": [
    {
      "number": 1,
      "description": "Fix description.",
      "scoreLift": "+3 to +5",
      "difficulty": "Specialist"
    },
    {
      "number": 2,
      "description": "Fix description.",
      "scoreLift": "+2 to +4",
      "difficulty": "Medium"
    },
    {
      "number": 3,
      "description": "Fix description.",
      "scoreLift": "+1 to +3",
      "difficulty": "Agent"
    }
  ],

  "conclusion": {
    "currentScore": 83,
    "projectedScore": "88–92",
    "text": "2–3 sentence forward-looking narrative.",
    "recommendation": "Single highest-priority recommended action.",
    "chain": "Agent → Brand → Market → site.com → Specialty 1 · Specialty 2"
  }
}
```

### Field Hard Rules

| Field           | Rule                                                                             |
| --------------- | -------------------------------------------------------------------------------- |
| `categories`    | Always 6 items (A–F), icons in order: crawl, entity, trust, answer, local, media |
| `severeIssues`  | Exactly 5 strings                                                                |
| `actionPlan`    | Exactly 3 tiers with colors: `#FB7A00`, `#F7B500`, `#9AA0AC`                     |
| `faqs`          | 6–9 items, answers 40–80 words each                                              |
| `priorityPages` | 8–14 rows, priority always "High" or "Medium"                                    |
| `aiQueries`     | Array of `{group, items}` objects, 3+ groups                                     |
| `fixes`         | 7–10 items, difficulty: "Specialist", "Medium", or "Agent" only                  |
| `scoreLift`     | "+X to +Y" format e.g. "+3 to +5"                                                |
| `chain`         | `→` between levels, `·` between specialties at end                               |
| `overallTier`   | Auto-derived: ≥85=Strong, 70–84=Moderate, 60–69=Weak, <60=Critical               |

---

## 8. Report Page Structure

The PDF produces 10–13 pages in this order:

| Page | Section                | Key content                                                                            |
| ---- | ---------------------- | -------------------------------------------------------------------------------------- |
| 1    | Cover                  | Dark hero bg (`#0E0E11`), score ring with tier color, grade, client name, market, site |
| 2    | Scorecard              | Hexagonal radar chart, horizontal score bars, 3×2 donut grid                           |
| 3–8  | Category Findings      | One page per category: icon, score, tier badge, lead, Working/Problems/Fixes columns   |
| 9    | Priority Issue         | (if provided) Narrative paragraph + canonical chain in amber on dark bg                |
| 10   | Action Plan            | Severe issues list (5 items, orange badges) + 3-tier plan + CTA banner                 |
| 11   | FAQ Blocks             | (if provided) 2-column Q&A grid, questions in orange                                   |
| 12   | Target Pages & Queries | Pages table left + query pills grouped by type                                         |
| 13   | Fix List + Conclusion  | Fix table with difficulty badges + dark conclusion card with score progression         |

---

## 9. SVG Math to Port from Python

The Python script generates SVG for donut charts and radar. Port these exactly:

### Donut Chart (per category score)

```python
# Python original
r = (size - sw) / 2         # ring radius
cx = cy = size / 2           # center
C = 2 * math.pi * r          # circumference
filled = v / 100 * C         # filled arc length
# Text vertical position:
num_y = cy + fs*0.18   # when sub-label present
num_y = cy + fs*0.355  # when no sub-label
```

TypeScript equivalent:

```typescript
function donut(
  value: number,
  size = 96,
  strokeWidth = 10,
  label?: string,
): string {
  const r = (size - strokeWidth) / 2;
  const cx = (cy = size / 2);
  const C = 2 * Math.PI * r;
  const filled = (value / 100) * C;
  const gap = C - filled;
  const color = tierColor(value);
  const fontSize = size * 0.28;
  const numY = label ? cy + fontSize * 0.18 : cy + fontSize * 0.355;
  // render SVG string...
}
```

### Radar Chart (6-point polygon)

```python
# Python original
cx = cy = size / 2
n = len(cats)
R = size/2 - (88 if n <= 5 else 82)   # radius shrinks for 6 cats
def pt(i, frac):
    ang = -math.pi/2 + i * 2*math.pi/n
    return cx + R*frac*math.cos(ang), cy + R*frac*math.sin(ang)
# Polygon: join all pt(i, score/100) with spaces
# Grid rings: draw at 0.25, 0.5, 0.75, 1.0 fractions
# Labels: draw at pt(i, 1.24) — outside the ring
```

TypeScript equivalent:

```typescript
function radar(categories: Category[], size = 520): string {
  const cx = (cy = size / 2);
  const n = categories.length;
  const R = size / 2 - (n <= 5 ? 88 : 82);
  const pt = (i: number, frac: number): [number, number] => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + R * frac * Math.cos(ang), cy + R * frac * Math.sin(ang)];
  };
  // render SVG string with polygon, grid rings, axis labels...
}
```

### Horizontal Bar (scorecard)

```typescript
function hbar(label: string, score: number): string {
  const color = tierColor(score);
  const width = `${score}%`;
  // render div with label, colored bar, score number
}
```

---

## 10. Icon SVG Paths

These 6 icons are embedded as inline SVG in each category block:

```typescript
const ICONS: Record<string, string> = {
  crawl: `<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>`,
  entity: `<circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/>`,
  trust: `<path d="M12 2L3 7v6c0 5 4 9.7 9 11 5-1.3 9-6 9-11V7z"/><polyline points="9,12 11,14 15,10"/>`,
  answer: `<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>`,
  local: `<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>`,
  media: `<circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/>`,
};
```

---

## 11. Core Helper: `lib/utils.ts`

```typescript
export function tierColor(score: number): string {
  if (score >= 85) return "#1BA85A"; // Strong
  if (score >= 70) return "#F2A60C"; // Moderate
  if (score >= 60) return "#E24A36"; // Weak
  return "#C0392B"; // Critical
}

export function tierLabel(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Moderate";
  if (score >= 60) return "Weak";
  return "Critical";
}

export function weightedScore(categories: Category[]): number {
  // Weights: A=20%, B=25%, C=20%, D=20%, E=10%, F=5%
  const weights = [0.2, 0.25, 0.2, 0.2, 0.1, 0.05];
  return Math.round(
    categories.reduce((sum, cat, i) => sum + cat.score * (weights[i] ?? 0), 0),
  );
}
```

---

## 12. `lib/audit-renderer.ts` — What to Build

This is the most critical file. It is a TypeScript port of the entire Python HTML generator (`AI_Visibility_Audit.py`). It must export one function:

```typescript
export function renderAuditHTML(data: AuditData): string;
```

This function returns a complete, self-contained HTML string (with all CSS inlined in `<style>` tags) that:

- Uses `@page` CSS rules for print/PDF pagination
- Has a named `@page cover` with no margins for the cover page
- Includes `break-before: page` on each major section
- Uses the Inter font (loaded from `/fonts/` or via Google Fonts CDN)
- Renders all SVG charts inline (donut, radar, hbar)
- Has running headers/footers via CSS `@page` (except cover)

**Section rendering functions to implement:**

```typescript
// Each returns an HTML string fragment
function renderCover(data: AuditData): string;
function renderScorecard(data: AuditData): string;
function renderCategoryBlock(cat: Category, index: number): string;
function renderPriorityIssue(issue: PriorityIssue): string;
function renderActionPlan(data: AuditData): string;
function renderFAQs(faqs: FAQ[]): string;
function renderPriorityPages(pages: PriorityPage[]): string;
function renderAIQueries(queries: AIQueryGroup[]): string;
function renderFixList(fixes: Fix[]): string;
function renderConclusion(conclusion: Conclusion, data: AuditData): string;
```

**Main assembler:**

```typescript
export function renderAuditHTML(data: AuditData): string {
  const sections = [
    renderCover(data),
    renderScorecard(data),
    ...data.categories.map((cat, i) => renderCategoryBlock(cat, i)),
    data.priorityIssue ? renderPriorityIssue(data.priorityIssue) : "",
    renderActionPlan(data),
    data.faqs?.length ? renderFAQs(data.faqs) : "",
    data.priorityPages?.length ? renderPriorityPages(data.priorityPages) : "",
    data.aiQueries?.length ? renderAIQueries(data.aiQueries) : "",
    data.fixes?.length ? renderFixList(data.fixes) : "",
    data.conclusion ? renderConclusion(data.conclusion, data) : "",
  ];
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${sections.join("")}</body></html>`;
}
```

---

## 13. `app/api/generate-pdf/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { renderAuditHTML } from "@/lib/audit-renderer";
import type { AuditData } from "@/lib/types";

export async function POST(req: NextRequest) {
  const data: AuditData = await req.json();
  const html = renderAuditHTML(data);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "Letter",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();

  const filename = `${data.contact.replace(/\s+/g, "_")}_GEO_Audit.pdf`;
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

---

## 14. `app/page.tsx` — Main Input Page

The main page has two tabs:

**Tab 1: Paste JSON**

- Large `<textarea>` for raw JSON paste
- "Validate" button that parses and highlights errors
- "Generate PDF" button that POSTs to `/api/generate-pdf`

**Tab 2: Fill Form** _(optional/future)_

- Structured form fields matching `AuditData` schema
- Same "Generate PDF" button

**UI components to use (from shadcn/ui):** `Tabs`, `TabsContent`, `Textarea`, `Button`, `Card`, `Label`

---

## 15. The `realtyrank-json` Claude Skill

A separate Claude skill already exists (saved in the user's Claude account). When invoked, you paste a realtor's website URL and Claude researches the agent across their website, Zillow, Realtor.com, brokerage profile, and other public signals, then outputs raw JSON matching the v2.0 schema above. No preamble, no code fences — raw JSON only.

**Skill name:** `realtyrank-json`

**Hard constraints the skill enforces:**

- Exactly 6 categories (A–F) with the icons in order: crawl, entity, trust, answer, local, media
- Exactly 5 `severeIssues`
- Exactly 3 `actionPlan` tiers
- `difficulty` values: "Specialist", "Medium", or "Agent" only
- `scoreLift` format: "+X to +Y"
- Weighted score: A(20%) + B(25%) + C(20%) + D(20%) + E(10%) + F(5%)

---

## 16. WeasyPrint → Puppeteer: What Changes

The Python system uses WeasyPrint which has several quirks already worked around. When porting to Puppeteer (Chromium-based), these known WeasyPrint workarounds are **no longer needed**:

| WeasyPrint workaround                        | Puppeteer behavior                  |
| -------------------------------------------- | ----------------------------------- |
| Can't use `var()` inside `linear-gradient()` | CSS variables work fine             |
| `display:inline-flex` badge rendering bug    | Works normally                      |
| `background-clip:text` not supported         | Works natively                      |
| SVG text baseline offset hack (`fs*0.355`)   | May need adjustment — test and tune |

**What still applies:**

- `@page` CSS rules for pagination
- `break-before: page` for section breaks
- `printBackground: true` in Puppeteer options (required for colored backgrounds)

---

## 17. Build Order

Tackle files in this order:

1. `lib/types.ts` — ✅ already written (see §6)
2. `lib/utils.ts` — tier helpers, score utils (small, do first)
3. `lib/audit-renderer.ts` — the main HTML generator (biggest file, core of the app)
4. `app/api/generate-pdf/route.ts` — Puppeteer PDF endpoint
5. `app/page.tsx` — input UI with JSON paste tab
6. Test end-to-end with the sample JSON in §7

---

## 18. Sample Test Payload

Use this minimal valid JSON to test the app end-to-end:

```json
{
  "overall": 83,
  "client": "Homes of Fort Bend",
  "contact": "Bret Wallace",
  "market": "Fort Bend County, Texas",
  "site": "homesoffortbend.com",
  "date": "July 21, 2026",
  "overallTier": "Moderate",
  "categories": [
    {
      "letter": "A",
      "name": "AI Crawlability",
      "score": 78,
      "icon": "crawl",
      "radarLabel": "AI\nCrawlability",
      "lead": "Site is indexable but lacks structured data.",
      "strengths": ["Fast load times", "Clean URL structure"],
      "problems": ["No schema markup", "Thin meta descriptions"],
      "fixes": [
        "Add JSON-LD schema",
        "Expand meta descriptions",
        "Submit sitemap to AI crawlers"
      ]
    },
    {
      "letter": "B",
      "name": "Entity & Knowledge Graph",
      "score": 88,
      "icon": "entity",
      "radarLabel": "Entity &\nGraph",
      "lead": "Strong entity presence across Google and Bing.",
      "strengths": ["Google Business Profile verified", "Consistent NAP data"],
      "problems": ["No Wikipedia or Wikidata entry", "LinkedIn incomplete"],
      "fixes": [
        "Build Wikidata entry",
        "Optimize LinkedIn profile",
        "Add entity markup to homepage"
      ]
    },
    {
      "letter": "C",
      "name": "Trust / Citations",
      "score": 84,
      "icon": "trust",
      "radarLabel": "Trust /\nCitations",
      "lead": "Good review volume but uneven platform coverage.",
      "strengths": [
        "4.9 stars on Google (127 reviews)",
        "Active Zillow profile"
      ],
      "problems": ["Few Realtor.com reviews", "No press mentions"],
      "fixes": [
        "Request Realtor.com reviews",
        "Pursue local press coverage",
        "Add testimonials page"
      ]
    },
    {
      "letter": "D",
      "name": "Answerability",
      "score": 79,
      "icon": "answer",
      "radarLabel": "Answer-\nability",
      "lead": "Content answers basic questions but lacks depth.",
      "strengths": ["Active blog", "Neighborhood guides exist"],
      "problems": ["No FAQ schema", "Thin buyer/seller guide content"],
      "fixes": [
        "Add FAQ schema markup",
        "Expand buyer guide to 1500+ words",
        "Create seller timeline page"
      ]
    },
    {
      "letter": "E",
      "name": "Hyperlocal Authority",
      "score": 86,
      "icon": "local",
      "radarLabel": "Hyperlocal\nAuthority",
      "lead": "Strong local signals in Fort Bend County.",
      "strengths": [
        "Active in local Facebook groups",
        "Neighborhood-specific pages"
      ],
      "problems": ["Missing some suburb pages", "No local event coverage"],
      "fixes": [
        "Add Missouri City page",
        "Create Sienna Plantation guide",
        "Cover local market stats monthly"
      ]
    },
    {
      "letter": "F",
      "name": "Multimodal & Media",
      "score": 75,
      "icon": "media",
      "radarLabel": "Multi-\nmodal",
      "lead": "Video presence exists but underutilized.",
      "strengths": ["YouTube channel active", "Listing videos published"],
      "problems": ["No video transcripts", "Low watch time on recent videos"],
      "fixes": [
        "Add transcripts to all videos",
        "Create neighborhood video tours",
        "Optimize YouTube titles for AI search"
      ]
    }
  ],
  "severeIssues": [
    "No JSON-LD schema markup on any page — AI cannot extract structured agent data",
    "FAQ content exists but lacks schema — invisible to AI answer extraction",
    "Entity profile inconsistent across Zillow, Realtor.com, and Google Business",
    "No video transcripts — multimodal content completely invisible to text-based AI",
    "Thin suburb pages for Missouri City and Pearland miss high-intent local queries"
  ],
  "actionPlan": [
    {
      "name": "Top Tier",
      "tag": "Immediate",
      "color": "#FB7A00",
      "items": [
        "Add JSON-LD schema to homepage and bio page",
        "Create FAQ page with schema markup",
        "Audit and unify NAP across all platforms"
      ]
    },
    {
      "name": "Mid Tier",
      "tag": "Next 30–60 days",
      "color": "#F7B500",
      "items": [
        "Expand buyer and seller guides to 1500+ words",
        "Add transcripts to top 10 YouTube videos",
        "Build Missouri City and Pearland neighborhood pages"
      ]
    },
    {
      "name": "Lower Tier",
      "tag": "Ongoing cleanup",
      "color": "#9AA0AC",
      "items": [
        "Publish monthly market stats posts",
        "Gather 10+ new Realtor.com reviews",
        "Create Wikidata entity entry"
      ]
    }
  ],
  "priorityIssue": {
    "title": "Schema Markup Gap",
    "text": "Bret Wallace has strong real-world authority signals — verified Google profile, 127 reviews, active YouTube channel — but AI systems cannot read any of it because there is zero structured data on the site. Adding JSON-LD schema to the homepage and bio page alone could lift the AI Crawlability score by 8–10 points in 30 days.",
    "chain": "Bret Wallace → Homes of Fort Bend → Coldwell Banker → Fort Bend County → homesoffortbend.com → Buyer Specialist · Relocation"
  },
  "faqs": [
    {
      "question": "Who is Bret Wallace?",
      "answer": "Bret Wallace is a licensed real estate agent serving Fort Bend County, Texas, with over 12 years of experience helping buyers, sellers, and relocating families. He operates under the Homes of Fort Bend brand, affiliated with Coldwell Banker, and specializes in Sugar Land, Missouri City, and Pearland neighborhoods."
    },
    {
      "question": "What brokerage is Bret Wallace with?",
      "answer": "Bret Wallace is affiliated with Coldwell Banker Realty under the Homes of Fort Bend brand. Coldwell Banker is one of the largest and most recognized real estate brands in the United States, giving Bret access to a national network while serving a deeply local Fort Bend County market."
    },
    {
      "question": "What areas does Bret Wallace serve?",
      "answer": "Bret Wallace primarily serves Fort Bend County, Texas, including Sugar Land, Missouri City, Pearland, Richmond, Rosenberg, and Sienna Plantation. He has deep neighborhood knowledge across all major Fort Bend communities and frequently works with corporate relocations into the Houston metro."
    },
    {
      "question": "Why choose Bret Wallace as your Realtor?",
      "answer": "Bret Wallace combines local market expertise with a data-driven approach to pricing and negotiation. His 127 Google reviews average 4.9 stars, reflecting consistent client satisfaction. He is particularly strong in relocation situations, having helped over 200 families move into Fort Bend County from out of state."
    },
    {
      "question": "How do I contact Bret Wallace?",
      "answer": "You can reach Bret Wallace through his website at homesoffortbend.com, via his Google Business profile, or through his Zillow and Realtor.com listings. He is highly responsive and typically replies to inquiries within a few hours during business days."
    },
    {
      "question": "Is Bret Wallace licensed in Texas?",
      "answer": "Yes, Bret Wallace holds an active Texas Real Estate License issued by the Texas Real Estate Commission (TREC). His license is in good standing and affiliated with Coldwell Banker Realty, which is also a licensed Texas brokerage operating in full compliance with TREC regulations."
    }
  ],
  "priorityPages": [
    {
      "page": "Sugar Land Realtor Page",
      "purpose": "Captures highest-volume local buyer and seller searches",
      "priority": "High"
    },
    {
      "page": "Missouri City Homes Page",
      "purpose": "Missing suburb coverage for second-largest service area",
      "priority": "High"
    },
    {
      "page": "Fort Bend County Market Stats",
      "purpose": "Monthly stats establish hyperlocal authority and answer AI market queries",
      "priority": "High"
    },
    {
      "page": "Buyer's Guide: Fort Bend County",
      "purpose": "Answer AI extraction queries about the buying process locally",
      "priority": "High"
    },
    {
      "page": "Seller's Guide: Pricing Your Home",
      "purpose": "Captures seller intent queries — currently no dedicated page",
      "priority": "High"
    },
    {
      "page": "Relocation to Fort Bend County",
      "purpose": "Corporate relo is Bret's niche — no dedicated landing page exists",
      "priority": "High"
    },
    {
      "page": "Sienna Plantation Neighborhood Guide",
      "purpose": "High-demand master-planned community with no dedicated coverage",
      "priority": "Medium"
    },
    {
      "page": "New Construction in Fort Bend County",
      "purpose": "Builder activity is high — captures new construction buyer queries",
      "priority": "Medium"
    },
    {
      "page": "FAQ Page with Schema Markup",
      "purpose": "Enables AI answer extraction from structured Q&A content",
      "priority": "High"
    },
    {
      "page": "Testimonials Page",
      "purpose": "Consolidates social proof for trust and citation signals",
      "priority": "Medium"
    }
  ],
  "aiQueries": [
    {
      "group": "Branded",
      "items": [
        "Who is Bret Wallace Realtor?",
        "Bret Wallace Fort Bend County real estate",
        "Homes of Fort Bend reviews",
        "Bret Wallace Coldwell Banker"
      ]
    },
    {
      "group": "Local",
      "items": [
        "Best Realtor in Sugar Land TX",
        "Real estate agent Fort Bend County TX",
        "Realtor in Missouri City TX",
        "Homes for sale Pearland TX agent"
      ]
    },
    {
      "group": "Service & Niche",
      "items": [
        "Fort Bend County relocation Realtor",
        "Sugar Land listing agent",
        "New construction buyer agent Fort Bend",
        "Luxury homes agent Sugar Land TX"
      ]
    }
  ],
  "fixes": [
    {
      "number": 1,
      "description": "Add JSON-LD Person and RealEstateAgent schema markup to the homepage and bio page. Include name, license number, brokerage, service areas, and social profile links.",
      "scoreLift": "+6 to +9",
      "difficulty": "Specialist"
    },
    {
      "number": 2,
      "description": "Create a structured FAQ page with HowTo and FAQPage schema. Target the 6 recommended questions in this report. Minimum 60 words per answer.",
      "scoreLift": "+4 to +6",
      "difficulty": "Specialist"
    },
    {
      "number": 3,
      "description": "Audit and unify NAP (Name, Address, Phone) across Google Business Profile, Zillow, Realtor.com, Facebook, LinkedIn, and the website footer. Every platform must match exactly.",
      "scoreLift": "+3 to +5",
      "difficulty": "Agent"
    },
    {
      "number": 4,
      "description": "Build a Missouri City neighborhood page with at least 800 words covering market stats, school districts, neighborhood vibe, and recent sales data.",
      "scoreLift": "+3 to +4",
      "difficulty": "Agent"
    },
    {
      "number": 5,
      "description": "Add transcripts to the top 10 YouTube videos. Upload as SRT files to YouTube and also publish transcript text on the corresponding website page.",
      "scoreLift": "+3 to +5",
      "difficulty": "Medium"
    },
    {
      "number": 6,
      "description": "Expand the buyer's guide to 1,500+ words covering the Fort Bend County buying process, school district overview, typical timelines, and financing options.",
      "scoreLift": "+2 to +4",
      "difficulty": "Agent"
    },
    {
      "number": 7,
      "description": "Create a dedicated relocation landing page targeting corporate relocations into Fort Bend County. Include employer proximity map, school ratings, and cost-of-living comparison.",
      "scoreLift": "+3 to +5",
      "difficulty": "Specialist"
    },
    {
      "number": 8,
      "description": "Publish a monthly Fort Bend County market stats post with median price, days on market, and inventory levels. Consistent publishing builds hyperlocal authority over 90 days.",
      "scoreLift": "+2 to +3",
      "difficulty": "Agent"
    },
    {
      "number": 9,
      "description": "Request 10+ Realtor.com reviews from past clients. Realtor.com reviews are underweighted in Bret's profile relative to Google and Zillow, creating a platform gap.",
      "scoreLift": "+1 to +3",
      "difficulty": "Agent"
    },
    {
      "number": 10,
      "description": "Create a Wikidata entity entry for Bret Wallace and Homes of Fort Bend. This directly strengthens the entity and knowledge graph score and takes under 2 hours to complete.",
      "scoreLift": "+2 to +4",
      "difficulty": "Specialist"
    }
  ],
  "conclusion": {
    "currentScore": 83,
    "projectedScore": "91–95",
    "text": "Bret Wallace enters this audit with genuinely strong foundations — verified profiles, excellent reviews, and consistent local market coverage. The gap between 83 and 95 is almost entirely structural: schema markup, FAQ content, and video transcripts that AI systems need to extract and surface his expertise. These are one-time implementations, not ongoing effort.",
    "recommendation": "Start with JSON-LD schema on the homepage and bio page — it is the single highest-leverage fix and can be deployed in one specialist session.",
    "chain": "Bret Wallace → Homes of Fort Bend → Coldwell Banker → Fort Bend County → homesoffortbend.com → Buyer Specialist · Relocation Expert"
  }
}
```

---

## 19. Quick Reference: Weighted Score Formula

```
Overall = (A × 0.20) + (B × 0.25) + (C × 0.20) + (D × 0.20) + (E × 0.10) + (F × 0.05)
```

Example: 78(0.20) + 88(0.25) + 84(0.20) + 79(0.20) + 86(0.10) + 75(0.05)
= 15.6 + 22.0 + 16.8 + 15.8 + 8.6 + 3.75 = **82.55 → rounds to 83**

---

_End of brief — paste this entire document into Claude Code to start the build._
