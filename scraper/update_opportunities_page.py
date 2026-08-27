#!/usr/bin/env python3
"""
Pipeline that scrapes live quant job postings and regenerates:
  - the job cards on ../opportunities.html
  - one standalone detail page per job under ../jobs/<slug>.html, with the
    full description, requirements, and pay -- linked from each card's
    "See More" button.

- Newly-seen postings (by source_url) are added to the TOP of the list.
- Postings no longer live on the company's board are dropped (closed reqs)
  and their detail page under jobs/ is deleted.
- Postings still live keep their existing position on the page -- only
  brand-new ones get inserted at the top, so the page doesn't reshuffle
  every run.
- Each card shows the date the role was actually posted (from the ATS),
  not the date this script happened to run.

State lives in site_jobs_state.json (display order, first-seen date, and
each job's stable slug) so re-runs are idempotent and detail-page URLs
don't change once assigned.

Usage:
    python3 update_opportunities_page.py
    python3 update_opportunities_page.py --dry-run   # scrape + diff only, don't write files
"""

import argparse
import hashlib
import html
import json
import re
from datetime import date
from pathlib import Path

from scrape_jobs import collect_jobs, log

SCRAPER_DIR = Path(__file__).resolve().parent
SITE_DIR = SCRAPER_DIR.parent
STATE_PATH = SCRAPER_DIR / "site_jobs_state.json"
OPPORTUNITIES_PATH = SITE_DIR / "opportunities.html"
JOBS_DIR = SITE_DIR / "jobs"

MARKER_START = "<!-- JOBS:AUTO-GENERATED:START -->"
MARKER_END = "<!-- JOBS:AUTO-GENERATED:END -->"

CATEGORY_SLUGS = {
    "Internship": "internship",
    "Full-Time": "full-time",
    "Event": "event",
}

PREVIEW_WORD_LIMIT = 400


def load_state():
    if not STATE_PATH.exists():
        return []
    with open(STATE_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_state(entries):
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2)
        f.write("\n")


def format_posted(date_posted):
    try:
        d = date.fromisoformat(date_posted)
    except (ValueError, TypeError):
        return date_posted or ""
    return f"{d.strftime('%b')} {d.day}, {d.year}"


def truncate_words(text, limit):
    words = text.split()
    if len(words) <= limit:
        return text
    return " ".join(words[:limit]) + "…"


def make_slug(company, role, source_url):
    base = re.sub(r"[^a-z0-9]+", "-", f"{company}-{role}".lower()).strip("-")
    base = base[:70].rstrip("-")
    digest = hashlib.sha1(source_url.encode("utf-8")).hexdigest()[:8]
    return f"{base}-{digest}" if base else digest


def requirements_list(job):
    return [r.strip() for r in job.get("requirements", "").split("|") if r.strip()]


def description_paragraphs(text):
    return [p.strip() for p in text.split("\n") if p.strip()] or [text]


# --------------------------------------------------------------- job card

def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def render_job_card(job):
    category_slug = CATEGORY_SLUGS.get(job["type"], "full-time")
    role = html.escape(job["role"])
    company = html.escape(job["company"])
    location = html.escape(job["location"])
    job_type = html.escape(job["type"])
    company_type = job.get("company_type") or "Other"
    company_type_slug = slugify(company_type)
    women_focused = job.get("women_focused") == "Yes"
    new_grad = job.get("new_grad") == "Yes"
    posted_date = job.get("date_posted", "")
    posted = format_posted(posted_date)
    apply_url = html.escape(job["source_url"] or "#", quote=True)
    apply_label = "Register" if job["type"] == "Event" else "Apply"
    detail_url = f"jobs/{job['slug']}.html"

    preview_description = html.escape(truncate_words(job["description"], PREVIEW_WORD_LIMIT))

    meta_spans = f"<span>{company}</span>"
    if location:
        meta_spans += f"\n              <span>{location}</span>"

    women_tag = ""
    if women_focused:
        women_tag = '\n            <span class="job-tag job-tag-women">Women+</span>'

    new_grad_tag = ""
    if new_grad:
        new_grad_tag = '\n            <span class="job-tag job-tag-new-grad">New Grad</span>'

    return f"""        <div class="job-card" data-category="{category_slug}" data-location="{location.lower()}" data-company-type="{company_type_slug}" data-posted="{posted_date}" data-women-focused="{"true" if women_focused else "false"}" data-new-grad="{"true" if new_grad else "false"}">
          <div class="job-main">
            <span class="job-tag">{job_type}</span>
            <span class="job-tag job-tag-muted">{html.escape(company_type)}</span>{women_tag}{new_grad_tag}
            <h3>{role}</h3>
            <p class="job-meta">
              {meta_spans}
            </p>
            <a href="{detail_url}" class="job-preview-link" target="_blank" rel="noopener">
              <p>{preview_description}</p>
              <span class="job-learn-more">Learn More <span aria-hidden="true">&rarr;</span></span>
            </a>
            <p class="job-posted">Posted {posted}</p>
          </div>
          <div class="job-action">
            <a href="{apply_url}" class="btn btn-primary" target="_blank" rel="noopener">{apply_label}</a>
          </div>
        </div>"""


def splice_into_page(job_entries):
    html_text = OPPORTUNITIES_PATH.read_text(encoding="utf-8")
    if MARKER_START not in html_text or MARKER_END not in html_text:
        raise RuntimeError(
            f"Could not find {MARKER_START!r} / {MARKER_END!r} markers in {OPPORTUNITIES_PATH}"
        )

    cards = "\n\n".join(render_job_card(job) for job in job_entries)
    block = f"{MARKER_START}\n\n{cards}\n\n{MARKER_END}"

    pattern = re.compile(re.escape(MARKER_START) + r".*?" + re.escape(MARKER_END), re.S)
    new_html = pattern.sub(lambda _match: block, html_text, count=1)
    OPPORTUNITIES_PATH.write_text(new_html, encoding="utf-8")


# ----------------------------------------------------------- detail pages

DETAIL_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{role} at {company} | PQC Opportunities</title>
<link rel="icon" href="../assets/pqc-logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/style.css">
</head>
<body>

<header class="site-header">
  <nav class="nav">
    <a class="brand" href="../index.html">
      <img src="../assets/pqc-logo-transparent.png" alt="PQC logo">
      <span>PQC<span class="brand-sub">Phoenix Quant Collective</span></span>
    </a>
    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links">
      <li><a href="../index.html">Home</a></li>
      <li><a href="../about.html">About</a></li>
      <li><a href="../team.html">Our Team</a></li>
      <li><a href="../events.html">Events</a></li>
      <li><a href="../opportunities.html" class="active">Opportunities</a></li>
      <li><a href="../resources.html">Resources</a></li>
      <li><a href="../contact.html">Contact</a></li>
    </ul>
  </nav>
</header>

<main>

  <section class="page-hero">
    <div class="container">
      <p class="eyebrow">{job_type} &middot; {category}</p>
      <h1>{role}</h1>
      <p>{meta_line}</p>
    </div>
  </section>

  <section class="section">
    <div class="container" style="max-width:760px;">
      <p><a href="../opportunities.html">&larr; Back to Opportunities</a></p>

      <div class="card job-detail-card" style="margin-top:24px;">
{description_html}{requirements_html}
        <a href="{apply_url}" class="btn btn-primary" target="_blank" rel="noopener">{apply_label} on {company}'s site</a>
      </div>
    </div>
  </section>

</main>

<footer class="site-footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="../assets/pqc-logo.png" alt="PQC logo">
          <span>PQC</span>
        </div>
        <p>Phoenix Quant Collective (PQC) is a student-led community supporting and advancing women in quantitative finance. We aim to build a community of confident women and prepare them for successful careers in the field.</p>
        <!--
        <div class="social-row">
          <a href="https://www.instagram.com/phoenixquantcollective/" aria-label="Instagram" target="_blank" rel="noopener">IG</a>
          <a href="https://www.linkedin.com/company/phoenix-quant-collective/" aria-label="LinkedIn" target="_blank" rel="noopener">in</a>
        </div>
        -->
      </div>
      <div>
        <h4>Navigate</h4>
        <ul>
          <li><a href="../about.html">About</a></li>
          <li><a href="../team.html">Our Team</a></li>
          <li><a href="../events.html">Events</a></li>
          <li><a href="../opportunities.html">Opportunities</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <div class="social-row">
          <a href="https://www.instagram.com/phoenixquantcollective/" aria-label="Instagram" target="_blank" rel="noopener">IG</a>
          <a href="https://www.linkedin.com/company/phoenix-quant-collective/" aria-label="LinkedIn" target="_blank" rel="noopener">in</a>
        </div>
        <!--
        <ul>
          <li><a href="mailto:club@example.edu">club@example.edu</a></li>
          <li>[Placeholder Address, Room XXX]</li>
          <li>University of Chicago</li>
        </ul>
        -->
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 PQC. All rights reserved.</span>
      <span>Site by PQC E-Board</span>
    </div>
  </div>
</footer>

<script src="../js/script.js"></script>
</body>
</html>
"""


def render_job_detail_page(job):
    role = html.escape(job["role"])
    company = html.escape(job["company"])
    location = html.escape(job["location"])
    job_type = html.escape(job["type"])
    category = html.escape(job["category"])
    posted = format_posted(job.get("date_posted", ""))
    apply_url = html.escape(job["source_url"] or "#", quote=True)
    apply_label = "Register" if job["type"] == "Event" else "Apply"

    meta_parts = [company]
    if location:
        meta_parts.append(location)
    if job.get("pay"):
        meta_parts.append(html.escape(job["pay"]))
    meta_parts.append(f"Posted {posted}")
    meta_line = " &middot; ".join(meta_parts)

    description_html = "\n".join(
        f"        <p>{html.escape(p)}</p>" for p in description_paragraphs(job["description"])
    )

    requirements_html = ""
    reqs = requirements_list(job)
    if reqs:
        items = "\n".join(f"          <li>{html.escape(r)}</li>" for r in reqs)
        requirements_html = f"\n        <h3>Requirements</h3>\n        <ul>\n{items}\n        </ul>\n"

    return DETAIL_PAGE_TEMPLATE.format(
        role=role,
        company=company,
        job_type=job_type,
        category=category,
        meta_line=meta_line,
        description_html=description_html,
        requirements_html=requirements_html,
        apply_url=apply_url,
        apply_label=apply_label,
    )


def write_detail_pages(job_entries):
    JOBS_DIR.mkdir(exist_ok=True)
    for job in job_entries:
        path = JOBS_DIR / f"{job['slug']}.html"
        path.write_text(render_job_detail_page(job), encoding="utf-8")


def remove_stale_detail_pages(kept_slugs):
    if not JOBS_DIR.exists():
        return
    for path in JOBS_DIR.glob("*.html"):
        if path.stem not in kept_slugs:
            path.unlink()


# ------------------------------------------------------------------ update

def update(dry_run=False, delay=0.4):
    fresh_rows = collect_jobs(include_programs=True, delay=delay)
    fresh_by_url = {row["source_url"]: row for row in fresh_rows if row["source_url"]}

    existing = load_state()
    existing_urls = {entry["source_url"] for entry in existing}

    today = date.today().isoformat()
    new_entries = []
    for url, row in fresh_by_url.items():
        if url in existing_urls:
            continue
        entry = {**row, "first_seen": today}
        entry["slug"] = make_slug(entry["company"], entry["role"], url)
        new_entries.append(entry)
    # Among this run's new postings, freshest (by the company's own posted
    # date) goes closest to the top.
    new_entries.sort(key=lambda j: j.get("date_posted", ""), reverse=True)

    kept_existing = []
    for entry in existing:
        fresh = fresh_by_url.get(entry["source_url"])
        if fresh is None:
            continue  # posting no longer live -- drop it (and its detail page)
        slug = entry.get("slug") or make_slug(fresh["company"], fresh["role"], entry["source_url"])
        merged = {**fresh, "first_seen": entry.get("first_seen", today), "slug": slug}
        kept_existing.append(merged)

    removed_count = len(existing) - len(kept_existing)
    final_entries = new_entries + kept_existing

    log(
        f"\n{len(new_entries)} new, {removed_count} closed/removed, "
        f"{len(final_entries)} total on page"
    )
    for entry in new_entries:
        log(f"  + {entry['company']}: {entry['role']}")

    if dry_run:
        log("(dry run -- not writing state, opportunities.html, or jobs/)")
        return

    save_state(final_entries)
    splice_into_page(final_entries)
    write_detail_pages(final_entries)
    remove_stale_detail_pages({e["slug"] for e in final_entries})
    log(f"Updated {OPPORTUNITIES_PATH} and {len(final_entries)} pages under {JOBS_DIR}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delay", type=float, default=0.4, help="seconds to sleep between requests")
    parser.add_argument("--dry-run", action="store_true", help="scrape and diff, but don't write any files")
    args = parser.parse_args()
    update(dry_run=args.dry_run, delay=args.delay)


if __name__ == "__main__":
    main()
