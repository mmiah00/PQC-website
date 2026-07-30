"""
Source configuration for the PQC quant job scraper.

GREENHOUSE_BOARDS / LEVER_BOARDS list the companies to pull live job
postings from, via each ATS's public read-only job-board API:

  Greenhouse: https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true
  Lever:      https://api.lever.co/v0/postings/{token}?mode=json

Both are the same public JSON feeds those companies use to power the
"careers" page embed on their own site, so pulling from them directly
is the standard, low-friction way to aggregate listings (no login,
no anti-bot wall, no ToS conflict) -- unlike scraping LinkedIn/Indeed/
Glassdoor search results, which actively block automated access and
prohibit it in their terms of service. This tool intentionally does
not touch those sites.

To add a company: find its token by checking whether its careers page
network requests hit boards-api.greenhouse.io or api.lever.co, or just
try the URL pattern above with a guessed token (a 404 means wrong
token/not on that ATS). Every token below was confirmed live.
"""

# (display name, greenhouse board token)
GREENHOUSE_BOARDS = [
    ("Jane Street", "janestreet"),
    ("Jump Trading", "jumptrading"),
    ("Akuna Capital", "akunacapital"),
    ("Tower Research Capital", "towerresearchcapital"),
    ("Squarepoint Capital", "squarepointcapital"),
    ("Old Mission", "oldmissioncapital"),
    ("IMC Trading", "imc"),
    ("Flow Traders", "flowtraders"),
    ("Schonfeld", "schonfeld"),
    ("ExodusPoint", "exoduspoint"),
]

# (display name, lever board token)
LEVER_BOARDS = [
    # Add confirmed Lever-hosted boards here, e.g.:
    # ("Company Name", "company-token"),
]

# Fixed taxonomy for the "Company Type" filter on the Opportunities page.
# Keep this list short and stable -- it's mirrored as the <select> options
# in opportunities.html, so adding a new *value* here means updating that
# markup too. Adding a new *company* just means adding a line below.
COMPANY_TYPES = {
    "Jane Street": "Proprietary Trading Firm",
    "Jump Trading": "Proprietary Trading Firm",
    "Akuna Capital": "Proprietary Trading Firm",
    "Tower Research Capital": "Proprietary Trading Firm",
    "Old Mission": "Proprietary Trading Firm",
    "IMC Trading": "Proprietary Trading Firm",
    "Flow Traders": "Market Maker",
    "Squarepoint Capital": "Hedge Fund",
    "Schonfeld": "Hedge Fund",
    "ExodusPoint": "Hedge Fund",
}
DEFAULT_COMPANY_TYPE = "Other"

# Static organization pages providing women-in-finance programs,
# fellowships, and events. These are scraped generically (title + meta
# description) since each org's site structure differs -- treat rows
# from this list as a starting point / directory entry, not a live
# job feed. Revisit periodically for dead links or better sub-pages
# (e.g. an org's specific /programs or /events URL once you've found
# a stable one worth targeting more precisely).
WOMEN_PROGRAM_SOURCES = [
    ("Girls Who Invest", "https://www.girlswhoinvest.org/"),
    ("100 Women in Finance", "https://100women.org/"),
    ("Forte Foundation", "https://www.fortefoundation.org/"),
    ("SEO (Sponsors for Educational Opportunity)", "https://www.seo-usa.org/"),
    ("Included VC", "https://www.included.vc/"),
]

# Job title / description keywords used to bucket each posting into
# one of the four categories the club cares about. Matching is
# case-insensitive substring search against "title + first ~2000
# chars of description". A posting must match at least one category
# to be kept -- this is what filters the firm's full job board down
# to just the quant-relevant roles.
CATEGORY_KEYWORDS = {
    "Quantitative Trading": [
        "quantitative trader", "quant trader", "trading intern",
        "execution trader", "trading associate", "systematic trader",
        "market maker", "market making",
    ],
    "Quantitative Research": [
        "quantitative researcher", "quant researcher", "research scientist",
        "quantitative research", "research intern", "machine learning researcher",
        "alpha research",
    ],
    "Quantitative Development": [
        "quantitative developer", "quant developer", "quant dev",
        "software engineer", "software developer", "sde", "trading systems",
        "infrastructure engineer",
    ],
    "Quantitative Finance": [
        "quantitative analyst", "quant analyst", "quantitative finance",
        "portfolio analyst", "risk analyst", "quantitative associate",
    ],
}

# Any of these appearing in the title/description tags a row as
# women-focused (in addition to its normal category), e.g. a firm's
# "Women in Trading" summer program listed as a regular job posting.
WOMEN_KEYWORDS = [
    "women in trading", "women in tech", "women in quant", "women in finance",
    "wit program", "female", "gender diversity", "girls who invest",
    "women's initiative", "diversity fellowship",
]

# Job titles containing any of these are dropped before classification --
# these are recruiter/talent/marketing postings and one-off events that
# otherwise slip into a quant category because the word "quantitative"
# or "trading" happens to appear in their title or body text.
EXCLUDE_TITLE_KEYWORDS = [
    "recruiter", "recruiting", "talent acquisition", "general submission",
    "campus ambassador",
]

# Titles containing any of these are pulled out as an "Event" listing
# (networking events, recruiting/info sessions, sneak peeks, diversity
# programs, etc.) instead of being scraped as a job or dropped. These
# show up mixed into the same Greenhouse/Lever boards as real job reqs.
EVENT_TITLE_KEYWORDS = [
    "networking event", "sneak peek", "expression of interest",
    "info session", "information session", "open house", "coffee chat",
    "meet the firm", "insight day", "insight week", "insight programme",
    "insight program", "diversity weekend", "diversity event", "spring week",
    "summer insight", "discovery day", "explorer program", "explorer day",
]

# Heading phrases (substring match) used to split each job's HTML
# content into "description" vs "requirements" buckets.
REQUIREMENT_HEADINGS = [
    "requirement", "qualification", "who you are", "what you'll need",
    "what you bring", "what you need", "you have", "you should have",
    "must have", "skills and experience", "ideal candidate", "about you",
    "what we're looking for", "what we look for", "minimum qualifications",
    "basic qualifications", "preferred qualifications", "what you'll bring",
    "you'll need", "skills", "qualities", "great candidate", "what makes you",
    "who should apply", "who we're looking for", "who we are looking for",
]

DESCRIPTION_HEADINGS = [
    "about the role", "about the position", "the role", "the opportunity",
    "what you'll do", "responsibilities", "overview", "the team",
    "about the team", "role overview", "position overview",
    "job description", "summary", "about the job",
]
