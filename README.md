# PQC Website

Website for **Phoenix Quant Collective (PQC)**, a student-led community at the
University of Chicago supporting and advancing women in quantitative finance.

Plain static HTML/CSS/JS — no build step, no framework, no package manager
needed to run the site itself. A small Python pipeline in `scraper/` scrapes
live job postings and regenerates the Opportunities page.

## Quickstart

Serve the site locally with anything that can serve static files, e.g.:

```bash
cd PQC-website
python3 -m http.server 8000
```

Then open **http://localhost:8000** in a browser (not `0.0.0.0` — that's just
the bind address, not something you can navigate to).

That's it — every page is a plain `.html` file with relative links to
`css/style.css`, `js/script.js`, and `assets/`, so there's nothing to install
or compile.

## Repo layout

```
PQC-website/
├── index.html          Home
├── about.html           History, focus areas, FAQ
├── team.html            Board members (flip cards, LinkedIn links)
├── events.html          Event listings
├── opportunities.html   Job board (auto-generated section, see below)
├── resources.html       Member resource links
├── contact.html         Contact info + form
├── css/
│   └── style.css        Single shared stylesheet for the whole site
├── js/
│   └── script.js        Single shared script for the whole site
├── assets/               Images, logos, background textures
├── jobs/                 Auto-generated: one detail page per scraped job
└── scraper/              Python pipeline that scrapes jobs + updates the site
```

### Pages

All 7 top-level `.html` files share the same header/nav/footer markup
(copy-pasted, not templated — this is a static site with no build step) and
pull from the same `css/style.css` and `js/script.js`. Edit any page directly;
there's no compile step to re-run.

### `css/style.css`

One stylesheet for the entire site. Color/font design tokens are defined as
CSS custom properties at the very top (`:root { --cream: ...; --maroon: ...; }`)
— change those to retheme the whole site at once. Below that, rules are
grouped by component (header/nav, hero, cards, team flip-cards, job cards,
accordion, footer, etc.), roughly in the order those components first appear
across the pages.

### `js/script.js`

Vanilla JS, no dependencies. Handles, in order: mobile nav toggle, the FAQ
accordion (about.html), team tab switching (team.html), team member flip
cards (team.html), and the Opportunities category filter (opportunities.html).

### `assets/`

- `pqc-logo.png` — logo on a cream background (used in the footer, where it
  needs contrast against the dark maroon marble)
- `pqc-logo-transparent.png` — logo with a transparent background (used in
  every page's nav bar, and as the faint background watermark on the homepage
  hero)
- `maroon_marble.jpg` — marble texture used as the site-wide footer
  background; `cream_marble.png` is the same idea for the header but isn't
  currently wired in (was tried and reverted)
- `PQC Logo.png`, `PQC Logo - Transparent Background.png` — original
  full-resolution uploads the working logos above were derived from
- `phoenixoutofashes.gif` — the original, **unprocessed** 47MB phoenix
  animation upload; not referenced by any page (too large to serve directly)
- `phoenix-logo-animated.gif`, `og_phoenix-logo-animated.gif`,
  `next_phoenix-logo-animated.gif`, `right-arrow.png` — extra assets from
  earlier iterations, not currently referenced by any page

Worth a cleanup pass at some point: the unprocessed 47MB GIF and the unused
variants above don't need to ship with the site, and there are a few stray
Windows `Zone.Identifier` sidecar files in `assets/` (harmless download
metadata, safe to delete) left over from file transfers.

### `jobs/`

One static HTML detail page per scraped job posting (e.g.
`jobs/jane-street-quantitative-trader-da2a65f1.html`), each with the full
job description, requirements, pay, and an Apply link. **Don't hand-edit
these** — they're regenerated every time the scraper pipeline runs, and
postings that close get their page deleted automatically.

## `scraper/` — the job pipeline

- `sources.py` — config: which companies to pull from (Greenhouse/Lever board
  tokens), women-in-finance org pages, and the keyword lists used to
  classify/filter postings. Add or remove a company here.
- `scrape_jobs.py` — the scraping/parsing/classification logic, plus a CLI
  (`python3 scrape_jobs.py`) that dumps everything to a CSV
  (`quant_opportunities.csv`) for review.
- `update_opportunities_page.py` — the actual pipeline: scrapes fresh
  postings, diffs them against `site_jobs_state.json`, adds new postings to
  the top of `opportunities.html`, removes closed ones (and their `jobs/`
  page), and regenerates each job's detail page.
- `site_jobs_state.json` — persisted state (display order, first-seen date,
  and stable slug for every job currently on the page). Auto-managed; don't
  hand-edit.
- `quant_opportunities.csv` — most recent raw CSV export.
- `requirements.txt` — one dependency: `requests`.

### Refreshing the job listings

```bash
cd scraper
python3 update_opportunities_page.py
```

Add `--dry-run` to preview what would change (new/closed postings) without
writing anything. `opportunities.html` marks the auto-generated region with
HTML comments —

```html
<!-- JOBS:AUTO-GENERATED:START -->
...job cards...
<!-- JOBS:AUTO-GENERATED:END -->
```

— only what's between those markers gets replaced; the filter buttons and
everything else on the page are untouched.

## Known placeholders

A few spots still have bracketed placeholder text or `lorem ipsum` pending
real details: the club email/address in every footer, board member photos,
and the "Past Events" section on `events.html`. Search for `[Placeholder` or
`lorem ipsum` to find them all.
