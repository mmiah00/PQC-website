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
    ("Optiver", "optiver"),
    ("Simplex Trading", "simplextrading"),
    ("Virtu Financial", "virtu"),
    ("Point72", "point72"),
    ("Man Group", "mangroup"),
    ("Winton", "winton"),
    ("AQR Capital Management", "aqr"),
    ("PDT Partners", "pdtpartners"),
    ("WorldQuant", "worldquant"),
    ("Marshall Wace", "marshallwace"),
    ("CFM (Capital Fund Management)", "cfm"),
    ("William Blair", "williamblair"),
    ("Numerix", "numerix"),
    ("Symphony", "symphony"),
    ("Jump Crypto", "jumpcrypto"),
    ("Coinbase", "coinbase"),
    ("B2C2", "b2c2"),
    ("Paradigm", "paradigm"),
    ("Oscar Health", "oscar"),
]

# (display name, lever board token)
LEVER_BOARDS = [
    ("The Voleon Group", "voleon"),
    ("Belvedere Trading", "belvederetrading"),
    ("ION Group", "ion"),
    ("Amber Group", "ambergroup"),
    ("Kraken", "kraken"),
    ("Oliver Wyman", "oliverwyman"),
    ("MetLife", "metlife"),
    ("Compass Lexecon", "compasslexecon"),
]

# Fixed taxonomy for the "Company Type" filter on the Opportunities page.
# Keep this list short and stable -- it's mirrored as the <select> options
# in opportunities.html, so adding a new *value* here means updating that
# markup too. Adding a new *company* just means adding a line below.
#
# Coverage note: Investment Banks, Asset Management Firms, Commodity
# Trading Houses, Financial Data Providers, Sovereign Wealth Funds,
# Pension Funds, and Exchanges/Clearinghouses are under-represented here
# (William Blair and MetLife are the only entries touching those
# categories) because the giants in those spaces -- Goldman Sachs,
# BlackRock, CME Group, sovereign/pension funds, etc. -- run on Workday,
# SuccessFactors, or fully custom ATS platforms rather than the public
# Greenhouse/Lever job-board APIs this scraper reads. Supporting those
# would mean a per-company Workday tenant/site integration, which is a
# separate, heavier piece of work than adding a line here.
COMPANY_TYPES = {
    # Quantitative Hedge Funds
    "Squarepoint Capital": "Quantitative Hedge Funds",
    "Schonfeld": "Quantitative Hedge Funds",
    "ExodusPoint": "Quantitative Hedge Funds",
    "Point72": "Quantitative Hedge Funds",
    "Man Group": "Quantitative Hedge Funds",
    "Winton": "Quantitative Hedge Funds",
    "AQR Capital Management": "Quantitative Hedge Funds",
    "PDT Partners": "Quantitative Hedge Funds",
    "WorldQuant": "Quantitative Hedge Funds",
    "Marshall Wace": "Quantitative Hedge Funds",
    "CFM (Capital Fund Management)": "Quantitative Hedge Funds",
    "The Voleon Group": "Quantitative Hedge Funds",
    # Proprietary Trading Firms
    "Jane Street": "Proprietary Trading Firms",
    "Jump Trading": "Proprietary Trading Firms",
    "Akuna Capital": "Proprietary Trading Firms",
    "Tower Research Capital": "Proprietary Trading Firms",
    "Old Mission": "Proprietary Trading Firms",
    "IMC Trading": "Proprietary Trading Firms",
    "Optiver": "Proprietary Trading Firms",
    "Simplex Trading": "Proprietary Trading Firms",
    "Belvedere Trading": "Proprietary Trading Firms",
    # Market Makers
    "Flow Traders": "Market Makers",
    "Virtu Financial": "Market Makers",
    # Investment Banks
    "William Blair": "Investment Banks",
    # Financial Technology Companies
    "Numerix": "Financial Technology Companies",
    "Symphony": "Financial Technology Companies",
    "ION Group": "Financial Technology Companies",
    # Crypto Trading Firms
    "Jump Crypto": "Crypto Trading Firms",
    "Coinbase": "Crypto Trading Firms",
    "B2C2": "Crypto Trading Firms",
    "Paradigm": "Crypto Trading Firms",
    "Amber Group": "Crypto Trading Firms",
    "Kraken": "Crypto Trading Firms",
    # Risk Management Consultancies
    "Oliver Wyman": "Risk Management Consultancies",
    # Insurance Companies
    "MetLife": "Insurance Companies",
    "Oscar Health": "Insurance Companies",
    # Economic Consulting Firms
    "Compass Lexecon": "Economic Consulting Firms",
}
DEFAULT_COMPANY_TYPE = "Other"

# The full taxonomy, including categories with no live source yet -- kept
# here (rather than just inferred from COMPANY_TYPES.values()) so the
# Opportunities page filter can list every category up front.
COMPANY_TYPE_CATEGORIES = [
    "Quantitative Hedge Funds",
    "Proprietary Trading Firms",
    "Market Makers",
    "Investment Banks",
    "Asset Management Firms",
    "Financial Technology Companies",
    "Crypto Trading Firms",
    "Commodity Trading Houses",
    "Risk Management Consultancies",
    "Financial Data Providers",
    "Sovereign Wealth Funds",
    "Pension Funds",
    "Insurance Companies",
    "Exchanges and Clearinghouses",
    "Economic Consulting Firms",
]

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
        "market maker", "market making", "algorithmic trader",
        "high-frequency trader", "high frequency trader", "volatility trader",
        "execution quantitative researcher", "crypto quant trader",
        "algorithmic execution", "order routing optimization",
        "liquidity provider trader", "options market maker",
        "etf arbitrage", "index arbitrage", "convertible bond arbitrage",
        "dark pool", "statistical arbitrage",
    ],
    "Quantitative Research": [
        "quantitative researcher", "quant researcher", "research scientist",
        "quantitative research", "quant research", "research intern",
        "machine learning researcher", "alpha research", "machine learning quant",
        "quantitative strategist", "macro quant strategist",
        "fx quantitative researcher", "factor investing", "smart beta",
        "deep learning research scientist", "natural language processing",
        "alternative data analyst", "financial econometrician",
        "time series analyst", "microstructure researcher",
        "event-driven quant", "trend following strategist",
        "high-frequency strategy researcher",
    ],
    "Quantitative Development": [
        "quantitative developer", "quant developer", "quant dev",
        "trading systems", "high-frequency developer", "high frequency developer",
        "low-latency engineer", "low latency engineer", "quantitative risk developer",
        "exchange product developer", "market data architect",
        "cloud infrastructure quant", "quant platform engineer",
        "backtesting platform", "execution algos developer", "quant qa engineer",
    ],
    "Quantitative Finance": [
        "quantitative analyst", "quant analyst", "quantitative finance",
        "portfolio analyst", "risk analyst", "quantitative associate",
        "quantitative intern", "financial engineer", "risk quant", "desk quant",
        "model validation analyst", "portfolio manager", "credit risk quant",
        "market risk analyst", "derivatives pricer", "systematic portfolio manager",
        "quantitative risk manager", "model risk auditor", "fixed income quant",
        "equity quant analyst", "commodity quant", "structured products analyst",
        "counterparty credit risk", "stress testing quantitative", "xva quant",
        "treasury quant analyst", "portfolio construction analyst",
        "asset allocation quant", "quantitative product manager",
        "quantitative compliance analyst", "surveillance analyst",
        "operations quant", "business intelligence quant", "cta portfolio manager",
        "quantitative consultant", "financial risk modeler", "credit scoring analyst",
        "actuarial quant", "insurance risk modeler", "catastrophe modeler",
        "climate risk quant", "esg quantitative analyst",
        "sovereign wealth fund quant", "pension fund quant", "private equity quant",
        "real estate quant", "high-yield bond quant", "municipal bond quant",
        "structured credit pricer", "securitization analyst", "mbs quant",
        "abs portfolio manager", "derivatives risk engineer",
        "clearinghouse risk manager", "junior quantitative analyst",
    ],
}

# Generic, industry-wide titles that mean "quant-adjacent" at a firm whose
# whole business is trading, but mean nothing of the sort at a 250-person
# insurance company or a consultancy -- a plain "Senior Software Engineer,
# Backend" at Oscar Health, or a "Data Scientist" at a random fintech, has
# nothing to do with quant finance. So these only count as a match when the
# company itself is one of the trading-native types below; everywhere else
# they're ignored (the firm's other, more specific listings can still match
# via CATEGORY_KEYWORDS above).
GENERIC_CATEGORY_KEYWORDS = {
    "Quantitative Development": [
        "software engineer", "software developer", "sde", "infrastructure engineer",
        "data engineer", "machine learning engineer", "distributed systems engineer",
        "devops engineer",
    ],
    "Quantitative Research": [
        "data scientist",
    ],
}
SWE_TRUSTED_COMPANY_TYPES = {
    "Proprietary Trading Firms",
    "Market Makers",
    "Quantitative Hedge Funds",
    "Crypto Trading Firms",
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

# Titles containing any of these, on a Full-Time posting, get tagged as
# "New Grad" -- entry-level roles for people who just graduated or have
# roughly 1-3 years of experience (as opposed to internships, which are
# their own type, or senior/experienced titles).
NEW_GRAD_KEYWORDS = [
    "campus", "graduate", "new grad", "entry level", "entry-level",
    "junior", "rotational program", "associate program",
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
