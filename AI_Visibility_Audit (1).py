#!/usr/bin/env python3
import math, os
from weasyprint import HTML

FONTS = "/home/claude/fonts"

# ----------------------------------------------------------------------------
# DATA
# ----------------------------------------------------------------------------
# Extended sections — defaults (override per client below)
PRIORITY_ISSUE = None
FAQS           = []
PRIORITY_PAGES = []
AI_QUERIES     = []
FIX_LIST       = []
CONCLUSION     = None
OVERALL_TIER   = "Moderate"  # single-word grade for cover

OVERALL = 83
CLIENT  = "Homes of Fort Bend"
CONTACT = "Bret Wallace"
MARKET  = "Fort Bend County, Texas"
SITE    = "homesoffortbend.com"
DATE    = "June 12, 2026"
OVERALL_TIER = "Moderate"

CATS = [
    {
        "n": "A", "key": "AI Crawlability", "score": 78,
        "icon": "crawl", "radar_lbl": "AI\nCrawlability",
        "lead": "The site is publicly discoverable with crawlable core pages, but robots.txt, sitemap contents, and live schema deployment could not be independently verified \u2014 leaving technical uncertainty in the crawl foundation.",
        "good": [
            "Publicly discoverable and indexed with core pages: Home, About, Contact, Blog, FAQ, Vlog, city guides, and a dedicated AI Entity Data page.",
            "Footer and navigation expose key sections: Blog, Vlog, Living Fort Bend, FAQ, Fulshear, Katy, Missouri City, Richmond, Rosenberg, and Sugar Land.",
        ],
        "bad": [
            "robots.txt and sitemap.xml could not be verified \u2014 AI and search crawlers may not have a reliable discovery map.",
            "Parsed home page did not expose obvious JSON-LD schema blocks, despite the AI entity page stating schema is active.",
        ],
        "fix": [
            "Validate robots.txt, sitemap index, canonical tags, and schema deployment using Google Search Console and Rich Results Test.",
            "Add or verify /llms.txt pointing to the AI entity page, About, Contact, FAQ hub, service pages, city guides, and video/transcript hub.",
            "Confirm Core Web Vitals, broken links, and IDX crawl behaviour are not suppressing key pages.",
        ],
    },
    {
        "n": "B", "key": "Entity & Knowledge Graph", "score": 88,
        "icon": "entity", "radar_lbl": "Entity &\nGraph",
        "lead": "This is the strongest module. A dedicated AI Entity Data page with NAP, licence, brokerage, sameAs links, and service areas gives AI crawlers an unusually clear entity-resolution target.",
        "good": [
            "AI entity page identifies: Bret Wallace, Realtor \u00b7 3616 Highway 6, Sugar Land TX 77478 \u00b7 (832) 641-3727 \u00b7 Texas licence 587559 \u00b7 RE/MAX Fine Properties.",
            "sameAs-style profile links to LinkedIn, Facebook, Instagram, YouTube, Zillow, HAR, Realtor.com, Pinterest, Yelp, and Homes.com \u2014 exactly the reconciliation layer AI systems need.",
        ],
        "bad": [
            "Name variants (Bret Wallace, Bret Wallace Realtor, Homes of Fort Bend, Moore Wallace Group) need ongoing disambiguation.",
            "Schema should be validated as rendered HTML, not just stated on the entity page.",
        ],
        "fix": [
            "Implement and validate Person, RealEstateAgent, LocalBusiness, Organization, WebSite, FAQPage, and sameAs schema across core pages.",
            "Create a 'Bret Wallace Reviews, Credentials & Local Proof' page.",
            "Normalise all name variants with one canonical primary and alternateName schema for the rest.",
        ],
    },
    {
        "n": "C", "key": "Trust / Citations", "score": 84,
        "icon": "trust", "radar_lbl": "Trust /\nCitations",
        "lead": "Strong public profile footprint across RE/MAX, HAR, Realtor.com, Zillow, and Homes.com \u2014 the opportunity is centralising all proof onto the owned site.",
        "good": [
            "Owned site shows recent review excerpts tied to Sugar Land and Fort Bend County; Zillow has visible 2025 review content.",
            "Realtor.com shows GRI credential, contact info, active/sold property data; RE/MAX lists CDPE and GRI designations and specialties.",
        ],
        "bad": [
            "No clearly structured central review/proof page with rating sources, testimonial schema, award validation, and transaction examples.",
            "HAR shows only 2 recommendations \u2014 not a strong independent-review signal relative to Bret's market experience.",
        ],
        "fix": [
            "Build a centralised proof hub with review excerpts grouped by buyer, seller, relocation, luxury, and Fort Bend neighbourhoods.",
            "Add 'as seen on' links to HAR, Zillow, Realtor.com, Homes.com, RE/MAX, Google Business Profile, YouTube, and LinkedIn.",
            "Add Review schema to testimonial content; include source labels, dates, and links.",
        ],
    },
    {
        "n": "D", "key": "Answerability", "score": 79,
        "icon": "answer", "radar_lbl": "Answer-\nability",
        "lead": "The AI entity page and FAQ page help, but accordion-style FAQ answers reduce extractability and most pages still lack the direct 40\u201380 word answer blocks that AI systems prefer.",
        "good": [
            "FAQ page covers buying steps, closing costs, appraisals, inspections, property tax protests, builder selection, homestead exemptions, and choosing a Realtor.",
            "AI entity page is highly extractable for NAP, licence, service areas, sameAs links, brand voice, and contact routing.",
        ],
        "bad": [
            "Accordion FAQ format may hide answer copy from AI crawlers if answers are not rendered in initial HTML.",
            "Pages lack copy-ready answer blocks directly answering: who Bret is, where he works, who he helps, his specialties, and proof.",
        ],
        "fix": [
            "Add visible 40\u201380 word answer blocks to Home, About, Contact, FAQ, city pages, and service pages.",
            "Validate FAQPage schema so accordion answers are machine-readable.",
            "Each major page should answer: who Bret is, where he works, who he helps, his specialties, brokerage, and how to contact him.",
        ],
    },
    {
        "n": "E", "key": "Hyperlocal Authority", "score": 86,
        "icon": "local", "radar_lbl": "Hyperlocal\nAuthority",
        "lead": "Strong Fort Bend content foundation with visible city/neighbourhood navigation and long-form local guides \u2014 the opportunity is adding structured proof, FAQs, and market stats to each city page.",
        "good": [
            "Navigation covers Fulshear, Katy, Missouri City, Outer Fort Bend, Richmond, Rosenberg, and Sugar Land.",
            "Blog includes: '26 Best Neighbourhoods in Richmond TX,' 'Ultimate Guide to Sugar Land Gated Communities,' and 'Master Planned Communities in Katy.'",
        ],
        "bad": [
            "City pages need structured 'best for' sections, housing types, price bands, school-district context, new construction options, and local FAQs.",
            "Market stats, local videos, and internal links to active listings are not yet maximally integrated into city pages.",
        ],
        "fix": [
            "Expand Sugar Land, Richmond, Fulshear, Katy, Missouri City, and Rosenberg into AI-ready local guides with FAQs, proof, and market data.",
            "Add structured comparison tables for gated communities and master-planned community pages.",
            "Link city pages to active listings, relocation guide, buyer guide, and review/proof hub.",
        ],
    },
    {
        "n": "F", "key": "Multimodal & Media", "score": 75,
        "icon": "media", "radar_lbl": "Multi-\nmodal",
        "lead": "Vlog page and YouTube channel exist with neighbourhood tour and Fort Bend content \u2014 adding transcripts, VideoObject schema, and structured chapters will make this content fully AI-readable.",
        "good": [
            "Vlog page labels: 'Bret Wallace Real Estate Vlog,' 'Fort Bend County TX Tour,' and 'Neighbourhood Tour Videos.'",
            "AI entity page includes official media assets: headshot and company logo references.",
        ],
        "bad": [
            "Full transcripts, VideoObject schema, structured chapters, and embedded local maps are not verified.",
            "Some blog images credited as AI-generated \u2014 real local photos carry stronger trust and local-authenticity signals.",
        ],
        "fix": [
            "Add transcripts, chapters, summaries, VideoObject schema, and custom thumbnails to all neighbourhood and market videos.",
            "Build a searchable video hub organised by market and niche with internal links to matching city/service pages.",
            "Add real neighbourhood photos with descriptive entity-specific filenames and alt text.",
        ],
    },
]

SEVERE = [
    "robots.txt and sitemap not independently verified \u2014 AI crawl guidance is uncertain",
    "Schema visibility unclear on parsed home page despite entity page claiming deployment",
    "Reviews and proof not centralised \u2014 no structured proof hub on the owned site",
    "FAQ accordions may hide answer copy from AI crawlers",
    "Video assets lack verified transcripts, VideoObject schema, and structured chapters",
]

PLAN = [
    ("Top Tier", "Immediate", "#FB7A00", [
        "Validate robots.txt, sitemap, canonical tags, and schema deployment via GSC and Rich Results Test",
        "Build the Reviews / Proof Hub with excerpts, source labels, Review schema, and third-party links",
        "Add visible answer blocks to Home, About, Contact, FAQ, and Fort Bend/Sugar Land pages",
    ]),
    ("Mid Tier", "Next 30\u201360 days", "#F7B500", [
        "Build Fort Bend County and Sugar Land primary Realtor authority pages",
        "Expand Fulshear, Katy, Missouri City, Richmond, and Rosenberg city guides with FAQs and proof",
        "Add FAQPage schema and validate accordion answers are fully crawler-readable",
    ]),
    ("Lower Tier", "Ongoing cleanup", "#9AA0AC", [
        "Add transcripts, VideoObject schema, and chapters to all neighbourhood tour videos",
        "Normalise citation profile NAP across HAR, Zillow, Realtor.com, Homes.com, and RE/MAX",
        "Add /llms.txt pointing to canonical AI-readable pages",
    ]),
]

PRIORITY_ISSUE = {
    "title": "Validate the Technical Foundation Before Expanding Content",
    "text": "Bret Wallace already has the strongest entity setup of any agent reviewed \u2014 a dedicated AI Entity Data page with NAP, licence, sameAs links, and brokerage confirmation. That is genuinely rare. The suppression risk is not visibility; it is verifiability. The crawler could not confirm robots.txt, sitemap contents, or live schema. If those technical elements are misconfigured, every other improvement is blocked. Validate the crawl foundation first, then build content on top of a verified base.",
    "chain": "Bret Wallace \u2192 Homes of Fort Bend \u2192 RE/MAX Fine Properties \u2192 Fort Bend County / Sugar Land / Richmond / Fulshear / Katy \u2192 homesoffortbend.com \u2192 Buyers \u00b7 Sellers \u00b7 Relocation \u00b7 New Construction \u00b7 Luxury",
}

FAQS = [
    {"q": "Who is Bret Wallace?", "a": "Bret Wallace is a Fort Bend County real estate agent affiliated with RE/MAX Fine Properties in Sugar Land, Texas, helping buyers, sellers, and relocation clients across Fort Bend County, including Sugar Land, Richmond, Fulshear, Katy, Rosenberg, and Missouri City."},
    {"q": "What brokerage is Bret Wallace with?", "a": "Bret Wallace is affiliated with RE/MAX Fine Properties. Office: 3616 Highway 6, Sugar Land, TX 77478. Phone: (832) 641-3727."},
    {"q": "What areas does Bret Wallace serve?", "a": "Bret primarily serves Fort Bend County and the greater Houston area, including Sugar Land, Richmond, Fulshear, Katy, Rosenberg, Missouri City, and surrounding communities."},
    {"q": "What types of clients does Bret Wallace help?", "a": "Bret helps buyers, sellers, relocation clients, new-construction buyers, and luxury residential clients. Specialties include luxury living, new construction, buyer brokerage, relocation, residential acreages, and investment lifestyle."},
    {"q": "Is Bret Wallace licensed in Texas?", "a": "Yes. The official AI entity page lists Bret Wallace's Texas Real Estate Commission licence as #587559."},
    {"q": "Does Bret Wallace work with relocation buyers?", "a": "Yes. Bret's AI entity page identifies relocation as a core discipline, and his RE/MAX profile lists it among his specialties."},
    {"q": "Why choose Bret Wallace?", "a": "Bret has a verified public footprint across RE/MAX, HAR, Realtor.com, Zillow, and Homes.com, a dedicated AI entity page with full NAP and sameAs links, Fort Bend local guides, neighbourhood tour videos, and client testimonials."},
    {"q": "How do I contact Bret Wallace?", "a": "Call (832) 641-3727 or visit homesoffortbend.com. Office address: 3616 Highway 6, Sugar Land, TX 77478."},
]

PRIORITY_PAGES = [
    {"page": "AI Entity Data Page",        "purpose": "Entity resolution hub \u2014 validate schema and link prominently", "priority": "High"},
    {"page": "Reviews / Proof Hub",        "purpose": "Centralise testimonials, credentials, awards, and third-party profiles", "priority": "High"},
    {"page": "Fort Bend County Realtor",   "purpose": "Primary service-area authority page", "priority": "High"},
    {"page": "Sugar Land Realtor Page",    "purpose": "Core local buyer/seller demand capture", "priority": "High"},
    {"page": "FAQ Hub with Schema",        "purpose": "Convert accordions into crawlable answer blocks with FAQPage schema", "priority": "High"},
    {"page": "Seller Guide",               "purpose": "Answer pricing, prep, negotiation, and timeline questions", "priority": "High"},
    {"page": "Buyer Guide",                "purpose": "Answer inspections, appraisals, financing, and offer process", "priority": "High"},
    {"page": "Relocation Guide",           "purpose": "Capture relocation queries \u2014 listed as a core RE/MAX specialty", "priority": "High"},
    {"page": "New Construction Guide",     "purpose": "Capture builder and new-home demand", "priority": "Medium"},
    {"page": "Gated Communities Hub",      "purpose": "Build on existing Sugar Land/Katy gated community content", "priority": "Medium"},
    {"page": "Video / Transcript Hub",     "purpose": "Make neighbourhood videos AI-readable with transcripts and schema", "priority": "Medium"},
    {"page": "City/Neighbourhood Cluster","purpose": "Richmond, Fulshear, Katy, Missouri City, Rosenberg", "priority": "Medium"},
]

AI_QUERIES = [
    ("Branded", [
        "Who is Bret Wallace Realtor?",
        "Is Bret Wallace with RE/MAX Fine Properties?",
        "Bret Wallace reviews",
        "Bret Wallace Fort Bend Realtor",
        "Homes of Fort Bend Bret Wallace",
    ]),
    ("Local", [
        "Best Realtor in Fort Bend County",
        "Realtor in Sugar Land TX",
        "Realtor in Richmond TX",
        "Realtor in Fulshear TX",
        "Realtor in Katy TX for Fort Bend buyers",
    ]),
    ("Service & Niche", [
        "Fort Bend County listing agent",
        "Fort Bend relocation Realtor",
        "New construction Realtor Fort Bend County",
        "Sugar Land gated communities Realtor",
        "Fort Bend luxury homes Realtor",
    ]),
]

FIX_LIST = [
    {"n": 1,  "fix": "Validate robots.txt, sitemap index, canonical tags, and indexability.", "lift": "+2 to +4", "diff": "Specialist"},
    {"n": 2,  "fix": "Validate entity schema across Home, About, Contact, and AI entity page using Person, RealEstateAgent, and LocalBusiness.", "lift": "+3 to +5", "diff": "Specialist"},
    {"n": 3,  "fix": "Create Reviews / Proof Hub with testimonials, source labels, Review schema, and third-party profile links.", "lift": "+3 to +5", "diff": "Agent"},
    {"n": 4,  "fix": "Add FAQPage schema and visible answer copy; fix accordion extractability.", "lift": "+2 to +4", "diff": "Medium"},
    {"n": 5,  "fix": "Add /llms.txt pointing to AI entity page, About, Contact, FAQ hub, and city guides.", "lift": "+1 to +2", "diff": "Specialist"},
    {"n": 6,  "fix": "Build Fort Bend County Realtor authority page with FAQs, proof, videos, and market data.", "lift": "+2 to +4", "diff": "Medium"},
    {"n": 7,  "fix": "Expand Sugar Land, Richmond, Fulshear, Katy, Missouri City, and Rosenberg area pages.", "lift": "+3 to +6", "diff": "Medium"},
    {"n": 8,  "fix": "Add video transcripts, VideoObject schema, structured chapters, and a searchable video hub.", "lift": "+2 to +4", "diff": "Specialist"},
    {"n": 9,  "fix": "Normalise citations and profile NAP consistency across HAR, Zillow, Realtor.com, and Homes.com.", "lift": "+2 to +4", "diff": "Specialist"},
    {"n": 10, "fix": "Add ImageObject schema, descriptive alt text, and real local photos to key pages.", "lift": "+1 to +2", "diff": "Agent"},
]

CONCLUSION = {
    "score_now": 83,
    "score_projected": "88\u201392",
    "text": "Bret Wallace already has the strongest entity foundation of any agent in this audit series \u2014 a dedicated AI entity page, verified sameAs links, and a strong third-party profile footprint. The next step is not more content; it is making the existing authority technically verifiable, proof-centralised, and answer-formatted for AI extraction.",
    "recommendation": "Validate the technical crawl and schema foundation first, then build the Reviews/Proof Hub and add answer blocks to Fort Bend and Sugar Land pages.",
    "chain": "Bret Wallace \u2192 Homes of Fort Bend \u2192 RE/MAX Fine Properties \u2192 Fort Bend County / Sugar Land / Richmond / Fulshear / Katy \u2192 homesoffortbend.com \u2192 Buyers \u00b7 Sellers \u00b7 Relocation \u00b7 New Construction \u00b7 Luxury",
}

# HELPERS
# ----------------------------------------------------------------------------
def score_color(v):
    if v >= 85: return "#1BA85A"
    if v >= 70: return "#F2A60C"
    if v >= 60: return "#E24A36"
    return "#C0392B"

def auto_tier(v):
    if v >= 85: return "Strong"
    if v >= 70: return "Moderate"
    if v >= 60: return "Weak"
    return "Critical"

def tier_color(tier):
    if tier == "Strong":   return "#1BA85A"
    if tier == "Moderate": return "#F2A60C"
    if tier == "Weak":     return "#E24A36"
    return "#C0392B"  # Critical or anything else

def donut(v, size=170, sw=15, fs=46, label=True, track="#EAEDF2", tier=None):
    r = (size - sw) / 2
    cx = cy = size / 2
    C = 2 * math.pi * r
    filled = v / 100 * C
    col = tier_color(tier) if tier else score_color(v)
    num_y = cy + fs*0.18 if label else cy + fs*0.355
    sub = f'<text x="{cx}" y="{cy+fs*0.64}" text-anchor="middle" class="g-sub">/ 100</text>' if label else ""
    return f'''<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" class="donut">
      <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{track}" stroke-width="{sw}"/>
      <circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{col}" stroke-width="{sw}"
              stroke-linecap="round" stroke-dasharray="{filled:.2f} {C-filled:.2f}"
              transform="rotate(-90 {cx} {cy})"/>
      <text x="{cx}" y="{num_y}" text-anchor="middle" class="g-num" style="font-size:{fs}px;fill:{col}">{v}</text>
      {sub}
    </svg>'''

def radar(cats, size=420):
    cx = cy = size / 2
    n = len(cats)
    R = size/2 - (88 if n <= 5 else 82)
    def pt(i, frac):
        ang = -math.pi/2 + i * 2*math.pi/n
        return cx + R*frac*math.cos(ang), cy + R*frac*math.sin(ang)
    rings = ""
    for g in (0.2, 0.4, 0.6, 0.8, 1.0):
        pts = " ".join(f"{x:.1f},{y:.1f}" for x,y in (pt(i,g) for i in range(n)))
        rings += f'<polygon points="{pts}" fill="none" stroke="#E5E8EE" stroke-width="1"/>'
    spokes = ""; labels = ""
    for i,c in enumerate(cats):
        x,y = pt(i,1.0)
        spokes += f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="#E5E8EE" stroke-width="1"/>'
        lx,ly = pt(i,1.24)
        lines = c.get("radar_lbl", c["key"]).split("\n")
        anchor = "middle"
        if lx < cx-5: anchor="end"
        elif lx > cx+5: anchor="start"
        dy0 = -(len(lines)-1)*7
        tspans = "".join(f'<tspan x="{lx:.1f}" dy="{14 if k>0 else dy0}">{ln}</tspan>' for k,ln in enumerate(lines))
        labels += f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="{anchor}" class="r-lab">{tspans}</text>'
    dpts = " ".join(f"{x:.1f},{y:.1f}" for x,y in (pt(i, cats[i]["score"]/100) for i in range(n)))
    dots = ""
    for i,c in enumerate(cats):
        x,y = pt(i, c["score"]/100)
        dots += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="#FB7A00" stroke="#fff" stroke-width="1.5"/>'
    return f'''<svg viewBox="0 0 {size} {size}" width="{size}" height="{size}" class="radar">
      {rings}{spokes}
      <polygon points="{dpts}" fill="rgba(251,122,0,0.16)" stroke="#FB7A00" stroke-width="2.5"/>
      {dots}{labels}
    </svg>'''

def hbar(label, v, tier=None):
    col = tier_color(tier) if tier else score_color(v)
    return f'''<div class="hbar">
      <div class="hbar-top"><span class="hbar-label">{label}</span><span class="hbar-val" style="color:{col}">{v}</span></div>
      <div class="hbar-track"><div class="hbar-fill" style="width:{v}%;background:{col}"></div></div>
    </div>'''

ICONS = {
 "crawl":'<path d="M3 9h18M9 21V9" /><rect x="3" y="3" width="18" height="18" rx="2"/>',
 "entity":'<circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M12 7.4v4M10.5 13l-4 3M13.5 13l4 3"/>',
 "trust":'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
 "answer":'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v5M12 14.5v.01"/>',
 "media":'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
 "local":'<path d="M12 22s-8-6-8-13a8 8 0 1 1 16 0c0 7-8 13-8 13z"/><circle cx="12" cy="9" r="3"/>',
}
def icon(name, stroke="#FB7A00", size=22):
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="{stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</svg>'

def cat_block(c):
    col = tier_color(auto_tier(c["score"]))
    good = "".join(f'<li>{g}</li>' for g in c["good"])
    bad  = "".join(f'<li>{b}</li>' for b in c["bad"])
    fix  = "".join(f'<li>{f}</li>' for f in c["fix"])
    return f'''<section class="cat">
      <div class="cat-head">
        <div class="cat-icon">{icon(c["icon"])}</div>
        <div class="cat-titlewrap">
          <div class="cat-num">CATEGORY {c["n"]}</div>
          <h3 class="cat-title">{c["key"]}</h3>
        </div>
        <div class="cat-gauge">{donut(c["score"], size=80, sw=8, fs=24, label=False, tier=auto_tier(c["score"]))}
          <div class="cat-tier" style="color:{col}">{auto_tier(c["score"])}</div>
        </div>
      </div>
      <p class="cat-lead">{c["lead"]}</p>
      <div class="cat-cols">
        <div class="col col-good"><div class="col-h"><span class="dot dot-g"></span>Working</div><ul>{good}</ul></div>
        <div class="col col-bad"><div class="col-h"><span class="dot dot-b"></span>Problems</div><ul>{bad}</ul></div>
      </div>
      <div class="fixbox"><div class="fix-h">{icon("trust","#FB7A00",16)} Critical fixes</div><ul class="fixlist">{fix}</ul></div>
    </section>'''

_sc_cols = 3 if len(CATS) == 6 else len(CATS)
scorecards = "".join(
    f'''<div class="sc-card">
       {donut(c["score"], size=128, sw=12, fs=34, label=False, tier=auto_tier(c["score"]))}
       <div class="sc-name">{c["key"]}</div>
       <div class="sc-tier" style="color:{tier_color(auto_tier(c['score']))}">{auto_tier(c['score'])}</div>
    </div>''' for c in CATS)

bars = "".join(hbar(c["key"], c["score"], tier=auto_tier(c["score"])) for c in CATS)
severe = "".join(f'<li><span class="sev-n">{i+1}</span>{s}</li>' for i,s in enumerate(SEVERE))

plan_html = ""
for tier, tag, col, items in PLAN:
    lis = "".join(f"<li>{it}</li>" for it in items)
    plan_html += f'''<div class="plan-tier">
      <div class="plan-bar" style="background:{col}"></div>
      <div class="plan-body">
        <div class="plan-toprow"><span class="plan-name">{tier}</span><span class="plan-tag" style="background:{col}22;color:{col}">{tag}</span></div>
        <ul class="plan-list">{lis}</ul>
      </div>
    </div>'''

# ----------------------------------------------------------------------------
# EXTENDED SECTIONS PRE-RENDER
# ----------------------------------------------------------------------------
pi_html = ""
if PRIORITY_ISSUE:
    chain = PRIORITY_ISSUE.get("chain","")
    chain_html = chain.replace("→","<b style='color:var(--orange)'>→</b>")
    pi_html = f'''<div class="pi-box">
      <p class="pi-text">{PRIORITY_ISSUE["text"]}</p>
      {"<div class='pi-chain'>" + chain_html + "</div>" if chain else ""}
    </div>'''

faq_html = ""
if FAQS:
    cards = "".join(
        f'<div class="faq-card"><div class="faq-q">{f["q"]}</div><div class="faq-a">{f["a"]}</div></div>'
        for f in FAQS)
    faq_html = f'''<section class="sec">
  <div class="eyebrow">RECOMMENDED FAQ BLOCKS</div>
  <div class="h2">AI-Ready <span class="grad">Q&amp;A Blocks</span></div>
  <p class="section-intro">Add these to the homepage, agent profile page, buyer page, seller page, and all high-priority city and neighborhood pages — each marked up with FAQ schema.</p>
  <div class="faq-grid">{cards}</div>
</section>'''

pq_html = ""
if PRIORITY_PAGES or AI_QUERIES:
    rows = "".join(
        f'<tr><td class="pt-name">{p["page"]}</td><td class="pt-purpose">{p["purpose"]}</td>'
        f'{"<td><span class=\'pri-"+p.get("priority","medium").lower()+"\'>" + p.get("priority","") + "</span></td>" if p.get("priority") else ""}'
        f'</tr>'
        for p in PRIORITY_PAGES)
    pages_block = f'<div class="pq-col"><div class="pq-head">Priority Pages to Build or Strengthen</div><table class="pages-table"><thead><tr><th>Page</th><th>Purpose</th>{"<th></th>" if any(p.get("priority") for p in PRIORITY_PAGES) else ""}</tr></thead><tbody>{rows}</tbody></table></div>' if rows else ""
    # Handle grouped or flat AI_QUERIES
    if AI_QUERIES and isinstance(AI_QUERIES[0], (list, tuple)):
        q_parts = []
        for grp, items in AI_QUERIES:
            pill_html = "".join(f'<span class="query-pill">&#8220;{q}&#8221;</span>' for q in items)
            q_parts.append(f'<div class="query-group"><div class="query-group-head">{grp}</div><div class="query-wrap">{pill_html}</div></div>')
        q_content = "".join(q_parts)
        queries_block = f'<div class="pq-col"><div class="pq-head">AI Queries This Site Should Win</div>{q_content}</div>'
    else:
        pills = "".join(f'<span class="query-pill">&#8220;{q}&#8221;</span>' for q in AI_QUERIES)
        queries_block = f'<div class="pq-col"><div class="pq-head">AI Queries This Site Should Win</div><div class="query-wrap">{pills}</div></div>' if pills else ""
    pq_html = f'''<section class="sec">
  <div class="eyebrow">TARGET PAGES &amp; QUERIES</div>
  <div class="h2">Where to Build <span class="grad">Authority</span></div>
  <p class="section-intro">Priority pages to create or strengthen, and the specific AI queries the site should dominate after optimization.</p>
  <div class="pq-wrap">{pages_block}{queries_block}</div>
</section>'''

fix_conclusion_html = ""
if FIX_LIST or CONCLUSION:
    _has_diff = any("diff" in f for f in FIX_LIST)
    fix_rows = "".join(
        f'<tr><td class="fix-nc"><span class="fix-nb">{f["n"]:02d}</span></td>'
        f'<td class="fix-tx">{f["fix"]}</td>'
        + (f'<td class="fix-diff"><span class="diff-badge diff-{f.get("diff","").lower().replace("/","-").replace(" ","-")}">{f.get("diff","")}</span></td>' if _has_diff else '')
        + f'<td class="fix-lt">{f["lift"]}</td></tr>'
        for f in FIX_LIST)
    _diff_th = '<th>Level</th>' if _has_diff else ''
    fix_table = f'<table class="fix-table"><thead><tr><th></th><th>Fix</th>{_diff_th}<th>Est. Score Lift</th></tr></thead><tbody>{fix_rows}</tbody></table>' if fix_rows else ""
    conc_block = ""
    if CONCLUSION:
        chain_str = CONCLUSION.get("chain","").replace("→"," &rarr; ")
        now_col = tier_color(auto_tier(CONCLUSION["score_now"]))
        conc_block = f'''<div class="conc-card">
      <div class="conc-scores">
        <div class="conc-score"><div class="conc-label">Current Score</div><div class="conc-val" style="color:{now_col}">{CONCLUSION["score_now"]}</div></div>
        <div class="conc-arrow">&rarr;</div>
        <div class="conc-score"><div class="conc-label">Projected After Fixes</div><div class="conc-val" style="color:#1BA85A">{CONCLUSION["score_projected"]}</div></div>
        <div class="conc-text-col"><p class="conc-text">{CONCLUSION["text"]}</p></div>
      </div>
      <div class="conc-rec">{icon("trust","#FB7A00",15)} {CONCLUSION["recommendation"]}</div>
      <div class="conc-chain">{chain_str}</div>
    </div>'''
    fix_conclusion_html = f'''<section class="sec">
  <div class="eyebrow">PRIORITIZED FIX LIST</div>
  <div class="h2">Ordered by <span class="grad">Score Lift</span></div>
  <p class="section-intro">Each fix is sequenced by expected AI visibility gain. Overlapping fixes will not add up to the full sum &mdash; the projection assumes all major items are implemented together.</p>
  {fix_table}
  {conc_block}
</section>'''

# ----------------------------------------------------------------------------
# HTML
# ----------------------------------------------------------------------------
HTML_DOC = f'''<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family:'Inter'; src:url('{FONTS}/Inter-Regular.woff2'); font-weight:400; }}
@font-face {{ font-family:'Inter'; src:url('{FONTS}/Inter-Medium.woff2'); font-weight:500; }}
@font-face {{ font-family:'Inter'; src:url('{FONTS}/Inter-SemiBold.woff2'); font-weight:600; }}
@font-face {{ font-family:'Inter'; src:url('{FONTS}/Inter-Bold.woff2'); font-weight:700; }}
@font-face {{ font-family:'Inter'; src:url('{FONTS}/Inter-ExtraBold.woff2'); font-weight:800; }}
@font-face {{ font-family:'Inter'; src:url('{FONTS}/Inter-Black.woff2'); font-weight:900; }}

:root {{ --orange:#FB7A00; --amber:#FFA300; --ink:#14161F; --muted:#5C6470; --soft:#8A92A0;
        --line:#E7EAEF; --card:#F6F7F9; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Inter',sans-serif; color:var(--ink); font-size:11pt; line-height:1.5; -weasy-hyphens:none; }}

@page {{
  size:Letter; margin:0.72in 0.66in 0.6in 0.66in;
  @top-left {{ content:"{CLIENT} \\00B7 AI Visibility & GEO Audit"; font-family:'Inter'; font-size:7.5pt; font-weight:600; color:#A7AEBA; vertical-align:bottom; padding-bottom:5pt; }}
  @top-right {{ content:"GEO AUDIT"; font-family:'Inter'; font-size:7.5pt; font-weight:700; letter-spacing:1.5px; color:#A7AEBA; vertical-align:bottom; padding-bottom:5pt; }}
  @bottom-left {{ content:"InboundREM \\00B7 Real Estate SEO & AI Visibility"; font-family:'Inter'; font-size:7.5pt; font-weight:600; color:#FB7A00; vertical-align:top; padding-top:5pt; }}
  @bottom-right {{ content:"Page " counter(page, decimal-leading-zero); font-family:'Inter'; font-size:7.5pt; font-weight:600; color:#A7AEBA; vertical-align:top; padding-top:5pt; }}
}}
@page cover {{ margin:0;
  @top-left {{ content:none; }} @top-right {{ content:none; }}
  @bottom-left {{ content:none; }} @bottom-right {{ content:none; }}
}}

.grad {{ color:var(--orange); }}
.sec {{ break-before:page; }}

/* ---------- COVER ---------- */
.cover {{ page:cover; background:#0E0E11; color:#fff; width:8.5in; height:11in; position:relative; overflow:hidden; }}
.cover::before {{ content:""; position:absolute; top:-15%; right:-25%; width:75%; height:75%;
   background:radial-gradient(circle, rgba(251,122,0,0.30), rgba(251,122,0,0) 68%); }}
.cover::after {{ content:""; position:absolute; bottom:-20%; left:-20%; width:60%; height:60%;
   background:radial-gradient(circle, rgba(255,179,0,0.12), rgba(255,179,0,0) 70%); }}
.cover-inner {{ position:relative; padding:0.6in 0.72in 0.5in; display:flex; flex-direction:column; height:11in; }}
.brandrow {{ display:flex; align-items:center; justify-content:space-between; }}
.logo {{ font-weight:800; font-size:15pt; letter-spacing:-0.3px; }}
.logo b {{ color:var(--orange); }}
.brand-sub {{ font-size:8.5pt; color:#8C8C95; letter-spacing:1.5px; font-weight:600; }}
.pill {{ display:flex; width:fit-content; white-space:nowrap; align-items:center; gap:8px; border:1.3px solid rgba(251,122,0,0.55);
   color:var(--amber); font-weight:600; font-size:9.5pt; padding:7px 16px; border-radius:30px; margin-top:0.42in; align-self:flex-start; }}
.cover h1 {{ font-weight:900; font-size:39pt; line-height:1.03; letter-spacing:-1.3px; margin-top:16px; }}
.cover .lede {{ font-size:12pt; color:#A8AEB8; font-weight:500; margin-top:15px; max-width:5.3in; line-height:1.45; }}
.cover .lede b {{ color:#fff; font-weight:700; }}

.scorepanel {{ display:flex; align-items:center; gap:26px; margin-top:0.22in;
   background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:18px; padding:18px 24px; align-self:flex-start; }}
.scorepanel .donut .g-num {{ font-weight:900; }}
.scorepanel .donut .g-sub {{ fill:#8C8C95; font-size:11px; font-weight:600; }}
.sp-right .sp-cap {{ font-size:9pt; letter-spacing:1.5px; color:#8C8C95; font-weight:700; }}
.sp-right .sp-grade {{ font-size:19pt; font-weight:800; margin-top:4px; }}
.sp-right .sp-note {{ font-size:9.5pt; color:#9AA0AC; margin-top:5px; max-width:2.7in; line-height:1.4; }}

.meta {{ margin-top:0.28in; display:grid; grid-template-columns:1fr 1fr; gap:7px 34px; }}
.meta .m {{ border-top:1px solid rgba(255,255,255,0.12); padding-top:8px; }}
.meta .m .k {{ font-size:7.8pt; letter-spacing:1.3px; color:#7E848E; font-weight:700; }}
.meta .m .v {{ font-size:10.5pt; font-weight:600; margin-top:2px; color:#EDEFF2; }}
.cover-foot {{ margin-top:20px; font-size:8.5pt; color:#6A6F79; }}

/* ---------- LIGHT SECTIONS ---------- */
.eyebrow {{ color:var(--orange); font-weight:700; font-size:9pt; letter-spacing:2.2px; }}
.h2 {{ font-weight:800; font-size:22pt; letter-spacing:-0.6px; line-height:1.08; margin-top:8px; }}
.section-intro {{ color:var(--muted); font-size:10.5pt; margin-top:11px; max-width:6.0in; line-height:1.5; }}
.over-wrap {{ display:flex; gap:30px; margin-top:26px; align-items:center; }}
.radar-box {{ flex:0 0 auto; }}
.over-right {{ flex:1; }}
.r-lab {{ font-size:8.6pt; font-weight:700; fill:#3A404C; }}
.bars {{ display:flex; flex-direction:column; gap:13px; }}
.hbar-top {{ display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px; }}
.hbar-label {{ font-weight:600; font-size:10pt; }}
.hbar-val {{ font-weight:800; font-size:12pt; }}
.hbar-track {{ height:9px; background:#EDEFF3; border-radius:6px; overflow:hidden; }}
.hbar-fill {{ height:100%; border-radius:6px; }}

.scorecards {{ display:grid; grid-template-columns:repeat(5,1fr); gap:12px; margin-top:30px; }}
.sc-card {{ background:var(--card); border:1px solid var(--line); border-radius:14px;
   padding:16px 8px 14px; text-align:center; }}
.sc-card .donut {{ display:block; margin:0 auto; width:96px; height:96px; }}
.sc-name {{ font-weight:700; font-size:8.4pt; line-height:1.25; margin-top:8px; min-height:30px; }}
.sc-tier {{ font-weight:700; font-size:8.2pt; margin-top:3px; }}
.g-num {{ font-weight:900; }} .g-sub {{ fill:#9AA0AC; font-weight:600; }}

.legend {{ display:flex; gap:18px; margin-top:24px; flex-wrap:wrap; }}
.legend .lg {{ display:flex; align-items:center; gap:7px; font-size:8.6pt; color:var(--muted); font-weight:500; }}
.legend .sw {{ width:11px; height:11px; border-radius:3px; }}

/* category blocks */
.cat {{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px;
   margin-bottom:13px; break-inside:avoid; box-shadow:0 1px 0 rgba(20,22,31,0.02); }}
.cat-head {{ display:flex; align-items:center; gap:13px; }}
.cat-icon {{ width:38px; height:38px; border-radius:10px; background:#FCE6D2;
   display:flex; align-items:center; justify-content:center; flex:0 0 auto; }}
.cat-titlewrap {{ flex:1; }}
.cat-num {{ font-size:7.4pt; letter-spacing:1.6px; color:var(--orange); font-weight:700; }}
.cat-title {{ font-weight:800; font-size:13pt; letter-spacing:-0.3px; margin-top:2px; }}
.cat-gauge {{ flex:0 0 auto; text-align:center; }}
.cat-gauge .donut {{ display:block; }}
.cat-tier {{ font-weight:700; font-size:7.6pt; margin-top:0px; }}
.cat-lead {{ color:var(--muted); font-size:9.3pt; margin:10px 0 11px; line-height:1.45; }}
.cat-cols {{ display:flex; gap:16px; }}
.col {{ flex:1; }}
.col-h {{ font-weight:700; font-size:8.8pt; display:flex; align-items:center; gap:7px; margin-bottom:6px; }}
.dot {{ width:8px; height:8px; border-radius:50%; display:inline-block; }}
.dot-g {{ background:#1BA85A; }} .dot-b {{ background:#E24A36; }}
.col ul {{ list-style:none; }}
.col li {{ font-size:8.7pt; color:#3D4350; line-height:1.36; padding-left:13px; position:relative; margin-bottom:5px; }}
.col li::before {{ content:""; position:absolute; left:0; top:5px; width:5px; height:5px; border-radius:50%; background:#C4C9D2; }}
.col-good li::before {{ background:#1BA85A; }}
.col-bad li::before {{ background:#E24A36; }}
.fixbox {{ background:linear-gradient(95deg, rgba(251,122,0,0.07), rgba(255,179,0,0.05));
   border:1px solid rgba(251,122,0,0.22); border-radius:11px; padding:11px 15px; margin-top:11px; }}
.fix-h {{ font-weight:800; font-size:8.8pt; color:#B85E04; display:flex; align-items:center; gap:7px; margin-bottom:6px; }}
.fixlist {{ list-style:none; }}
.fixlist li {{ font-size:8.7pt; color:#5A3B12; line-height:1.36; padding-left:15px; position:relative; margin-bottom:4px; }}
.fixlist li::before {{ content:"\\2192"; position:absolute; left:0; color:var(--orange); font-weight:800; }}

/* severe + plan page */
.split {{ display:flex; gap:26px; margin-top:26px; }}
.severe {{ flex:1; }}
.severe-box {{ background:#1A1212; border:1px solid rgba(226,74,54,0.3); border-radius:16px; padding:22px 22px; }}
.severe-h {{ color:#FF8A6E; font-weight:800; font-size:11pt; letter-spacing:0.3px; margin-bottom:14px; display:flex; align-items:center; gap:8px; }}
.severe ul {{ list-style:none; }}
.severe li {{ color:#E9DCDA; font-size:10pt; line-height:1.4; display:flex; align-items:flex-start; gap:12px; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.07); }}
.severe li:last-child {{ border-bottom:none; }}
.sev-n {{ flex:0 0 auto; width:22px; height:22px; border-radius:7px; background:rgba(226,74,54,0.22);
   color:#FF8A6E; font-weight:800; font-size:9pt; display:flex; align-items:center; justify-content:center; }}
.plan {{ flex:1.05; }}
.plan-tier {{ display:flex; gap:0; background:var(--card); border:1px solid var(--line);
   border-radius:13px; overflow:hidden; margin-bottom:8px; }}
.plan-bar {{ flex:0 0 6px; }}
.plan-body {{ padding:10px 14px; flex:1; }}
.plan-toprow {{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }}
.plan-name {{ font-weight:800; font-size:11pt; }}
.plan-tag {{ font-size:7.8pt; font-weight:700; padding:3px 9px; border-radius:20px; letter-spacing:0.4px; }}
.plan-list {{ list-style:none; }}
.plan-list li {{ font-size:9pt; color:#3D4350; line-height:1.4; padding-left:15px; position:relative; margin-bottom:5px; }}
.plan-list li::before {{ content:"\\2713"; position:absolute; left:0; color:var(--orange); font-weight:800; }}

.cta {{ margin-top:18px; background:#FB7A00;
   border-radius:16px; padding:16px 24px; color:#fff; display:flex; align-items:center; justify-content:space-between; }}
.cta-l h4 {{ font-size:15pt; font-weight:800; letter-spacing:-0.3px; }}
.cta-l p {{ font-size:10pt; opacity:0.92; margin-top:4px; max-width:6.6in; }}
.cta-btn {{ background:#14161F; color:#fff; font-weight:700; font-size:10pt; padding:13px 22px; border-radius:30px; white-space:nowrap; }}

.tierdef {{ display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }}
.tierdef .td {{ flex:1; min-width:1.2in; background:var(--card); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }}
.tierdef .td .rng {{ font-weight:800; font-size:9.5pt; }}
.tierdef .td .nm {{ font-size:8pt; color:var(--muted); font-weight:600; margin-top:2px; }}

/* ---- Priority Issue ---- */
.pi-box {{ background:rgba(251,122,0,0.07); border-left:4px solid var(--orange); border-radius:0 12px 12px 0; padding:16px 20px; margin-top:18px; }}
.pi-text {{ font-size:9pt; color:#3D4350; line-height:1.6; }}
.pi-chain {{ margin-top:12px; background:var(--hero); color:var(--amber); border-radius:8px; padding:10px 16px; font-size:8.5pt; font-weight:600; line-height:1.9; }}
/* ---- FAQ ---- */
.faq-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }}
.faq-card {{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:13px 15px; break-inside:avoid; }}
.faq-q {{ font-weight:700; font-size:8.5pt; color:var(--orange); margin-bottom:5px; }}
.faq-a {{ font-size:8pt; color:#3D4350; line-height:1.55; }}
/* ---- Priority Pages + AI Queries ---- */
.pq-wrap {{ display:flex; gap:28px; margin-top:16px; align-items:flex-start; }}
.pq-col {{ flex:1; }}
.pq-head {{ font-weight:800; font-size:9.5pt; color:var(--hero); margin-bottom:10px; }}
.pages-table {{ width:100%; border-collapse:collapse; font-size:8.5pt; }}
.pages-table th {{ text-align:left; font-weight:700; font-size:7.5pt; letter-spacing:0.4px; color:var(--muted); text-transform:uppercase; padding:5px 8px; border-bottom:2px solid var(--line); }}
.pages-table .pt-name {{ font-weight:700; color:var(--hero); padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }}
.pages-table .pt-purpose {{ color:#3D4350; padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }}
.pages-table tr:nth-child(even) td {{ background:var(--card); }}
.query-wrap {{ display:flex; flex-wrap:wrap; gap:7px; margin-top:6px; }}
.query-pill {{ font-size:7.8pt; color:#3D4350; background:var(--card); border:1px solid var(--line); border-radius:20px; padding:5px 11px; }}
/* ---- Fix List ---- */
.fix-table {{ width:100%; border-collapse:collapse; margin-top:16px; font-size:8.5pt; }}
.fix-table th {{ text-align:left; font-weight:700; font-size:7.5pt; letter-spacing:0.4px; color:var(--muted); text-transform:uppercase; padding:5px 8px; border-bottom:2px solid var(--line); }}
.fix-table .fix-nc {{ width:34px; padding:6px 6px; border-bottom:1px solid var(--line); vertical-align:middle; }}
.fix-nb {{ display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; background:var(--orange); color:#fff; border-radius:50%; font-weight:800; font-size:7.5pt; }}
.fix-table .fix-tx {{ padding:6px 10px; border-bottom:1px solid var(--line); color:#3D4350; line-height:1.45; vertical-align:middle; }}
.fix-table .fix-lt {{ padding:6px 8px; border-bottom:1px solid var(--line); font-weight:700; font-size:8pt; color:var(--orange); white-space:nowrap; text-align:right; vertical-align:middle; }}
.fix-table tr:nth-child(even) td {{ background:var(--card); }}
/* ---- Conclusion ---- */
.conc-card {{ background:var(--hero); color:#fff; border-radius:14px; padding:18px 24px; margin-top:14px; break-inside:avoid; }}
.conc-scores {{ display:flex; align-items:center; gap:20px; margin-bottom:14px; flex-wrap:nowrap; }}
.conc-score {{ text-align:center; flex:0 0 auto; }}
.conc-label {{ font-size:7pt; letter-spacing:0.5px; text-transform:uppercase; color:#9AA0AC; font-weight:600; margin-bottom:3px; }}
.conc-val {{ font-size:24pt; font-weight:900; line-height:1; }}
.conc-arrow {{ font-size:18pt; color:#4A4F5C; flex:0 0 auto; }}
.conc-text-col {{ flex:1; }}
.conc-text {{ font-size:8.5pt; color:#B0B8C8; line-height:1.6; margin:0; }}
.conc-rec {{ font-weight:700; font-size:9.5pt; color:#fff; margin-bottom:10px; display:flex; align-items:center; gap:8px; }}
.conc-chain {{ background:rgba(251,122,0,0.15); border-radius:8px; padding:10px 16px; font-size:8pt; color:var(--amber); font-weight:600; line-height:1.9; }}/* ---- Grouped query sections ---- */
.query-group {{ margin-bottom:14px; }}
.query-group-head {{ font-weight:700; font-size:8pt; letter-spacing:0.5px; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }}
/* ---- Difficulty badges on fix list ---- */
.fix-diff {{ width:88px; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align:middle; }}
.diff-badge {{ display:inline-block; font-size:7pt; font-weight:700; padding:2px 7px; border-radius:20px; white-space:nowrap; }}
.diff-medium {{ background:#FFF3E0; color:#E65100; }}
.diff-specialist {{ background:#FCE4EC; color:#C62828; }}
.diff-agent {{ background:#E8F5E9; color:#2E7D32; }}
/* ---- Priority badge on pages table ---- */
.pri-high {{ display:inline-block; font-size:7pt; font-weight:700; padding:2px 7px; border-radius:20px; background:rgba(251,122,0,0.12); color:var(--orange); }}
.pri-medium {{ display:inline-block; font-size:7pt; font-weight:700; padding:2px 7px; border-radius:20px; background:rgba(240,200,12,0.12); color:#B8860B; }}
</style></head><body>

<!-- ============ PAGE 1 : COVER ============ -->
<div class="cover">
 <div class="cover-inner">
  <div class="brandrow">
    <div class="logo">Inbound<b>REM</b></div>
    <div class="brand-sub">AI VISIBILITY &amp; GEO AUDIT</div>
  </div>
  <div class="pill">{icon("trust","#FFB300",15)} Built for Real Estate Agents</div>
  <h1>Be the <span class="grad">#1 Agent</span><br>That AI Recommends</h1>
  <p class="lede">A full AI-visibility &amp; Generative Engine Optimization audit for <b>{CLIENT}</b>, measuring how clearly AI assistants can find, trust and recommend your business.</p>

  <div class="scorepanel">
    {donut(OVERALL, size=140, sw=14, fs=42, label=False, tier=auto_tier(OVERALL))}
    <div class="sp-right">
      <div class="sp-cap">OVERALL AI VISIBILITY</div>
      <div class="sp-grade" style="color:{tier_color(auto_tier(OVERALL))}">{auto_tier(OVERALL)}</div>
      <div class="sp-note">Strong third-party authority from Zillow, Realtor.com, and RE/MAX — the opportunity is schema, consistent entity data, and answer-first pages to unlock full AI visibility.</div>
    </div>
  </div>

  <div class="meta">
    <div class="m"><div class="k">PREPARED FOR</div><div class="v">{CONTACT}</div></div>
    <div class="m"><div class="k">BRAND</div><div class="v">{CLIENT}</div></div>
    <div class="m"><div class="k">PRIMARY MARKET</div><div class="v">{MARKET}</div></div>
    <div class="m"><div class="k">WEBSITE</div><div class="v">{SITE}</div></div>
    <div class="m"><div class="k">PROFILES REVIEWED</div><div class="v">Zillow · Realtor.com · BBB · external signals</div></div>
    <div class="m"><div class="k">AUDIT DATE</div><div class="v">{DATE}</div></div>
  </div>
  <div class="cover-foot">Prepared by InboundREM — Real Estate SEO &amp; AI Visibility (GEO)</div>
 </div>
</div>

<!-- ============ SCORE OVERVIEW ============ -->
<section class="sec">
  <div class="eyebrow">THE SCORECARD</div>
  <div class="h2">How AI Sees Your Business <span class="grad">Today</span></div>
  <p class="section-intro">Your overall score of <b>{OVERALL}/100</b> reflects {len(CATS)} dimensions of AI visibility across {MARKET}. The radar map shows where {CONTACT}&rsquo;s strongest signals sit &mdash; and where targeted fixes will close the remaining gaps.</p>

  <div class="over-wrap">
    <div class="radar-box">{radar(CATS, size=352)}</div>
    <div class="over-right">
      <div class="bars">{bars}</div>
    </div>
  </div>

  <div class="scorecards" style="grid-template-columns:repeat({_sc_cols},1fr)">{scorecards}</div>



</section>

<!-- ============ DETAILED FINDINGS ============ -->
<section class="sec">
  <div class="eyebrow">CATEGORY BREAKDOWN</div>
  <div class="h2">Strengths, Gaps <span class="grad">and Fixes</span></div>
  <p class="section-intro">Each category is scored individually, showing what's already working, the concrete problems found, and the highest-impact fixes.</p>
  <div style="margin-top:18px">
    {"".join(cat_block(c) for c in CATS)}
  </div>
</section>

{f'''<section class="sec">
  <div class="eyebrow">PRIORITY ISSUE</div>
  <div class="h2">The Highest-Lift <span class="grad">Fix First</span></div>
  {pi_html}
</section>''' if pi_html else ''}

<!-- ============ SEVERE + ACTION PLAN ============ -->
<section class="sec">
  <div class="eyebrow">WHAT TO FIX FIRST</div>
  <div class="h2">Severe Issues &amp; <span class="grad">Action Plan</span></div>
  <p class="section-intro">The most damaging gaps, paired with a sequenced plan ordered by lift — start at the top tier for the fastest gains in AI recommendations.</p>

  <div class="split" style="margin-top:22px">
    <div class="severe">
      <div class="severe-box">
        <div class="severe-h">{icon("answer","#FF8A6E",18)} Top Severe Issues</div>
        <ul>{severe}</ul>
      </div>
    </div>
    <div class="plan">
      {plan_html}
    </div>
  </div>

  <div class="cta">
    <div class="cta-l">
      <h4>Claim your AI ranking before the field catches up</h4>
      <p>Only ~0.5% of agents currently rank in AI &ldquo;Top 10&rdquo; lists. Every fix in this report moves {CONTACT} and {CLIENT} closer to that position &mdash; and ahead of every competitor who hasn&rsquo;t started yet.</p>
    </div>
  </div>

  <div class="tierdef">
    <div class="td"><div class="rng" style="color:#1BA85A">Strong</div><div class="nm">Strong visibility</div></div>
    <div class="td"><div class="rng" style="color:#F2A60C">Moderate</div><div class="nm">Room to improve</div></div>
    <div class="td"><div class="rng" style="color:#E24A36">Weak</div><div class="nm">Significant gaps</div></div>
    <div class="td"><div class="rng" style="color:#C0392B">Critical</div><div class="nm">Foundation missing</div></div>
  </div>
</section>

{faq_html}
{pq_html}
{fix_conclusion_html}

</body></html>'''

with open("/home/claude/report.html","w") as f:
    f.write(HTML_DOC)

HTML(string=HTML_DOC, base_url="/home/claude").write_pdf("/home/claude/Bret_Wallace_GEO_Audit.pdf")
print("PDF written")
