#!/usr/bin/env python3
"""
PQC quant job & program scraper.

Pulls live postings from public ATS job-board APIs (Greenhouse, Lever)
for a configurable list of quant trading / research firms, keeps only
roles matching quant finance / research / development / trading, tags
internship vs full-time and women-focused postings, and writes
everything to a CSV. Also pulls a short directory of women-in-finance
program/org pages (title + description) into the same file.

Usage:
    python3 scrape_jobs.py
    python3 scrape_jobs.py --output jobs.csv --delay 0.5
    python3 scrape_jobs.py --no-programs   # skip the women-org directory rows

Edit sources.py to add/remove companies or program URLs.
"""

import argparse
import csv
import html
import re
import sys
import time
from datetime import date, datetime, timezone
from html.parser import HTMLParser

import requests

from sources import (
    CATEGORY_KEYWORDS,
    DESCRIPTION_HEADINGS,
    EXCLUDE_TITLE_KEYWORDS,
    GREENHOUSE_BOARDS,
    LEVER_BOARDS,
    REQUIREMENT_HEADINGS,
    WOMEN_KEYWORDS,
    WOMEN_PROGRAM_SOURCES,
)

USER_AGENT = (
    "PQC-JobScraper/1.0 (+https://github.com/; student club listing aggregator; "
    "contact via club site)"
)
REQUEST_TIMEOUT = 15
CSV_FIELDS = [
    "role", "company", "type", "category", "women_focused", "pay",
    "location", "description", "requirements", "source_url",
    "date_posted", "date_scraped",
]
MAX_FIELD_CHARS = 8000  # safety cap only -- real postings run ~1500-5500 chars;
                        # this stores the full text, the site does its own
                        # shorter preview truncation at render time

PAY_PATTERN = re.compile(
    r"\$[\d,]+(?:\.\d+)?(?:\s*-\s*\$?[\d,]+(?:\.\d+)?)?"
    r"(?:\s*(?:per\s+year|/\s*year|/\s*yr|per\s+hour|/\s*hour|/\s*hr|annually))?",
    re.IGNORECASE,
)

BLOCK_TAGS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "tr"}
SKIP_TAGS = {"script", "style"}


def log(msg):
    print(msg, file=sys.stderr)


# ---------------------------------------------------------------- fetching

def fetch_greenhouse_jobs(token):
    url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
    resp = requests.get(
        url, params={"content": "true"}, headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT,
    )
    if resp.status_code != 200:
        log(f"  [greenhouse:{token}] HTTP {resp.status_code}, skipping")
        return []
    return resp.json().get("jobs", [])


def fetch_lever_jobs(token):
    url = f"https://api.lever.co/v0/postings/{token}"
    resp = requests.get(
        url, params={"mode": "json"}, headers={"User-Agent": USER_AGENT},
        timeout=REQUEST_TIMEOUT,
    )
    if resp.status_code != 200:
        log(f"  [lever:{token}] HTTP {resp.status_code}, skipping")
        return []
    return resp.json()


# ---------------------------------------------------------- html -> blocks

class _BlockExtractor(HTMLParser):
    """Walks the HTML and emits (text, is_bullet) per block-level element,
    so a <li> can never be mistaken for a heading -- that structural fact
    is what a plain regex-stripped text blob throws away, and losing it is
    what made short bullets like "Strong communication skills" get misread
    as section headings in earlier iterations of this parser."""

    def __init__(self):
        super().__init__()
        self.blocks = []
        self._buf = []
        self._li_depth = 0
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self._skip_depth += 1
        elif tag == "li":
            self._flush()
            self._li_depth += 1
        elif tag in BLOCK_TAGS:
            self._flush()

    def handle_startendtag(self, tag, attrs):
        if tag == "br":
            self._flush()

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self._skip_depth = max(0, self._skip_depth - 1)
        elif tag == "li":
            self._flush(force_bullet=True)
            self._li_depth = max(0, self._li_depth - 1)
        elif tag in BLOCK_TAGS:
            self._flush()

    def handle_data(self, data):
        if self._skip_depth == 0:
            self._buf.append(data)

    def _flush(self, force_bullet=False):
        text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
        self._buf = []
        if text:
            self.blocks.append((text, force_bullet or self._li_depth > 0))


def html_to_blocks(raw_html):
    """Unescape a (possibly double-encoded) HTML string and split it into
    (text, is_bullet) blocks along element boundaries."""
    text = html.unescape(raw_html or "")
    parser = _BlockExtractor()
    parser.feed(text)
    return parser.blocks


def html_to_lines(raw_html):
    """Flat list of text lines, for classification/pay-extraction callers
    that don't need bullet vs. heading structure."""
    return [text for text, _is_bullet in html_to_blocks(raw_html)]


def bucket_blocks(blocks):
    """Split (text, is_bullet) blocks into (description, requirements)
    using heading keywords. Best-effort heuristic -- review output before
    publishing.

    A block can only be treated as a section heading if it did NOT come
    from a <li> -- bullets are always content, never headings, no matter
    how short they look. Among non-bullet blocks: a colon ending
    ("Qualifications:") is an unambiguous heading signal on its own;
    without a colon, a short block ("About You", "Skills & Experience")
    is only treated as a heading if it actually matches a known heading
    phrase, or is short with no ending punctuation (bare "About Us"
    style) in which case it's an unrecognized heading and its section is
    ignored rather than guessed at.
    """
    description, requirements = [], []
    section = "description"
    for text, is_bullet in blocks:
        if is_bullet:
            if section == "description":
                description.append(text)
            elif section == "requirements":
                requirements.append(text)
            continue

        stripped = text.strip()
        lower = stripped.rstrip(":").strip().lower()
        req_match = any(k in lower for k in REQUIREMENT_HEADINGS)
        desc_match = any(k in lower for k in DESCRIPTION_HEADINGS)

        ends_in_colon = stripped.endswith(":") and len(stripped) < 100
        looks_like_heading = (
            len(stripped) < 40
            and len(stripped.split()) <= 5
            and not stripped.endswith((".", ",", ";"))
        )

        if ends_in_colon or looks_like_heading:
            if req_match:
                section = "requirements"
            elif desc_match:
                section = "description"
            else:
                section = "ignore"
            continue

        if section == "description":
            description.append(text)
        elif section == "requirements":
            requirements.append(text)
    return " ".join(description).strip(), " | ".join(requirements).strip()


def bucket_lines(lines):
    """Back-compat wrapper: bucket a flat list of lines (no bullet info),
    treating every line as non-bullet."""
    return bucket_blocks([(ln, False) for ln in lines])


def extract_pay(text):
    match = PAY_PATTERN.search(text)
    return match.group(0).strip() if match else ""


def greenhouse_posted_date(job):
    # "first_published" looks like "2026-06-22T16:14:59-04:00" -- the date
    # portion is all we want and slicing avoids any timezone-parsing edge
    # cases across Python versions.
    value = job.get("first_published") or job.get("updated_at") or ""
    return value[:10] if value else ""


def lever_posted_date(job):
    epoch_ms = job.get("createdAt")
    if not epoch_ms:
        return ""
    try:
        return datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc).date().isoformat()
    except (TypeError, ValueError, OSError):
        return ""


def trim(text, limit=MAX_FIELD_CHARS):
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


# --------------------------------------------------------------- classify

def is_excluded_title(title):
    lower = title.lower()
    return any(kw in lower for kw in EXCLUDE_TITLE_KEYWORDS)


def classify_category(title, body_text=""):
    # Classify from the title alone. Matching against the full description
    # too was tried and rejected: firms mention "software engineer" or
    # "quantitative research" in the body text of unrelated postings
    # (recruiter roles, hardware/ops roles) far more often than the title
    # does, which pulled in a lot of false positives.
    haystack = title.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return category
    return None


def classify_type(title, body_text=""):
    if re.search(r"\bintern(ship)?\b", title.lower()):
        return "Internship"
    return "Full-Time"


def is_women_focused(title, body_text):
    haystack = f"{title} {body_text[:2000]}".lower()
    return any(kw in haystack for kw in WOMEN_KEYWORDS)


# ----------------------------------------------------------- normalizing

def build_row(role, company, job_type, category, women_focused, pay, location,
              description, requirements, source_url, date_posted=""):
    return {
        "role": role,
        "company": company,
        "type": job_type,
        "category": category,
        "women_focused": "Yes" if women_focused else "No",
        "pay": pay,
        "location": location,
        "description": trim(description),
        "requirements": trim(requirements),
        "source_url": source_url,
        "date_posted": date_posted or date.today().isoformat(),
        "date_scraped": date.today().isoformat(),
    }


def process_greenhouse_job(company, job):
    title = job.get("title", "").strip()
    if is_excluded_title(title):
        return None

    category = classify_category(title)
    if category is None:
        return None

    blocks = html_to_blocks(job.get("content", ""))
    plain_text = " ".join(text for text, _is_bullet in blocks)
    description, requirements = bucket_blocks(blocks)

    location = re.sub(r"\s+", " ", (job.get("location") or {}).get("name", "")).strip()
    return build_row(
        role=title,
        company=company,
        job_type=classify_type(title),
        category=category,
        women_focused=is_women_focused(title, plain_text),
        pay=extract_pay(plain_text),
        location=location,
        description=description,
        requirements=requirements,
        source_url=job.get("absolute_url", ""),
        date_posted=greenhouse_posted_date(job),
    )


def process_lever_job(company, job):
    """Lever postings arrive with labeled sections already split out in
    `lists` (each a {text: <label>, content: <html>} pair, e.g. label
    "Requirements" or "What you'll do"), so route by label instead of
    re-running the heading heuristic Greenhouse's single content blob
    needs."""
    title = job.get("text", "").strip()
    if is_excluded_title(title):
        return None

    category = classify_category(title)
    if category is None:
        return None

    desc_html = job.get("descriptionPlain") or job.get("description", "") or ""
    description_parts = [text for text, _ in html_to_blocks(desc_html)]
    requirements_parts = []

    for item in job.get("lists", []) or []:
        label = (item.get("text") or "").strip().lower()
        bullets = [text for text, _ in html_to_blocks(item.get("content", "") or "")]
        if any(k in label for k in REQUIREMENT_HEADINGS):
            requirements_parts.extend(bullets)
        elif any(k in label for k in DESCRIPTION_HEADINGS) or not label:
            description_parts.extend(bullets)
        # else: unrecognized label (e.g. "Benefits") -- dropped

    description = " ".join(description_parts).strip()
    requirements = " | ".join(requirements_parts).strip()
    plain_text = f"{title} {description} {requirements}"

    categories = job.get("categories", {}) or {}
    location = re.sub(r"\s+", " ", categories.get("location", "")).strip()
    return build_row(
        role=title,
        company=company,
        job_type=classify_type(title),
        category=category,
        women_focused=is_women_focused(title, plain_text),
        pay=extract_pay(plain_text),
        location=location,
        description=description,
        requirements=requirements,
        source_url=job.get("hostedUrl", ""),
        date_posted=lever_posted_date(job),
    )


# ---------------------------------------------------------- women programs

def scrape_program_page(name, url):
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:
        log(f"  [program:{name}] failed to fetch ({exc}), skipping")
        return None

    html_text = resp.text
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html_text, re.I | re.S)
    desc_match = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']',
        html_text, re.I,
    )
    page_title = html.unescape(title_match.group(1)).strip() if title_match else name
    page_desc = html.unescape(desc_match.group(1)).strip() if desc_match else ""

    return build_row(
        role=page_title,
        company=name,
        job_type="Program/Event",
        category="Women in Quant Finance",
        women_focused=True,
        pay="",
        location="",
        description=page_desc,
        requirements="",
        source_url=url,
    )


# ------------------------------------------------------------- collection

def collect_jobs(include_programs=True, delay=0.4):
    """Fetch + classify postings from every configured source. Shared by
    the CSV export below and by update_opportunities_page.py so both pull
    from exactly one code path."""
    rows = []

    for company, token in GREENHOUSE_BOARDS:
        log(f"Fetching Greenhouse board: {company} ({token})")
        try:
            jobs = fetch_greenhouse_jobs(token)
        except requests.RequestException as exc:
            log(f"  request failed: {exc}")
            continue
        kept = 0
        for job in jobs:
            row = process_greenhouse_job(company, job)
            if row:
                rows.append(row)
                kept += 1
        log(f"  {kept}/{len(jobs)} postings matched quant categories")
        time.sleep(delay)

    for company, token in LEVER_BOARDS:
        log(f"Fetching Lever board: {company} ({token})")
        try:
            jobs = fetch_lever_jobs(token)
        except requests.RequestException as exc:
            log(f"  request failed: {exc}")
            continue
        kept = 0
        for job in jobs:
            row = process_lever_job(company, job)
            if row:
                rows.append(row)
                kept += 1
        log(f"  {kept}/{len(jobs)} postings matched quant categories")
        time.sleep(delay)

    if include_programs:
        for name, url in WOMEN_PROGRAM_SOURCES:
            log(f"Fetching program page: {name}")
            row = scrape_program_page(name, url)
            if row:
                rows.append(row)
            time.sleep(delay)

    return rows


# ------------------------------------------------------------------- main

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="quant_opportunities.csv", help="output CSV path")
    parser.add_argument("--delay", type=float, default=0.4, help="seconds to sleep between requests")
    parser.add_argument("--no-programs", action="store_true", help="skip the women-in-finance org directory rows")
    args = parser.parse_args()

    rows = collect_jobs(include_programs=not args.no_programs, delay=args.delay)

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)

    log(f"\nWrote {len(rows)} rows to {args.output}")


if __name__ == "__main__":
    main()
