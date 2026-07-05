import os
import re

# The files we want to update with the public menu
FILES_TO_UPDATE = [
    "index.html",
    "about.html",
    "pricing.html",
    "blog.html",
    "faq.html",
    "contact.html",
    "auth.html",
    "generate.html",
    "showcase.html",
    "referral-program.html",
    "buy-credits.html",
    "local-keyword-planner.html",
    "gbp-audit.html",
    "citation-scanner.html",
    "grid-scanner.html",
    "competitor-gap.html",
    "schema-generator.html",
    "review-link-generator.html",
    "review-calculator.html",
    "seo-roi-calculator.html",
    "audit.html",
    "free-seo-audit.html",
    "404.html",
    "privacy.html",
    "terms.html",
    "case-studies.html",
    "usage-based-pricing.html",
    "forgot-password.html",
    "reset-password.html",
    "gbp-post-generator.html",
    "review-request-generator.html",
    "widget-preview.html"
]

NEW_HEADER = """<header>
      <nav>
        <div class="container">
          <a class="logo" href="/">
            <img src="/images/logo.svg" alt="LocalLeads Logo" class="logo-svg" />
          </a>
          <div class="mobile-menu-container">
            <button class="close-menu-btn" id="close-menu-btn" aria-label="Close menu">
              <i class="fas fa-times"></i>
            </button>
            <ul class="nav-links" id="nav-menu">
              <li><a href="/">Home</a></li>
              <li><a href="/generate.html">Generate Pages</a></li>
              <li class="dropdown">
                <a href="#" class="dropdown-trigger" aria-haspopup="true" aria-expanded="false">Tools <i class="fas fa-chevron-down"></i></a>
                <ul class="dropdown-menu">
                  <li><a href="/local-keyword-planner.html"><i class="fas fa-search-location"></i> Keyword Planner</a></li>
                  <li><a href="/gbp-audit.html"><i class="fas fa-building"></i> GBP Audit</a></li>
                  <li><a href="/citation-scanner.html"><i class="fas fa-map-marker-alt"></i> Citation Scanner</a></li>
                  <li><a href="/grid-scanner.html"><i class="fas fa-th"></i> Grid Scanner</a></li>
                  <li><a href="/competitor-gap.html"><i class="fas fa-chart-bar"></i> Competitor Gap</a></li>
                  <li><a href="/schema-generator.html"><i class="fas fa-code"></i> Schema Generator</a></li>
                  <li><a href="/review-link-generator.html"><i class="fas fa-link"></i> Review Link Gen</a></li>
                  <li><a href="/review-flyer.html"><i class="fas fa-file-image"></i> Review Flyer</a></li>
                  <li><a href="/review-calculator.html"><i class="fas fa-calculator"></i> Review Calculator</a></li>
                  <li><a href="/seo-roi-calculator.html"><i class="fas fa-chart-line"></i> ROI Calculator</a></li>
                  <li><a href="/gbp-post-generator.html"><i class="fas fa-paper-plane"></i> GBP Post Gen</a></li>
                  <li><a href="/review-request-generator.html"><i class="fas fa-comments"></i> Review Request Gen</a></li>
                  <li><a href="/widget-preview.html"><i class="fas fa-sliders-h"></i> Widget Builder</a></li>
                  <li><a href="/audit.html"><i class="fas fa-search"></i> Free SEO Audit</a></li>
                </ul>
              </li>
              <li><a href="/pricing.html">Pricing</a></li>
              <li><a href="/showcase.html">Showcase</a></li>
              <li><a href="/blog.html">Blog</a></li>
              <li><a href="/referral-program.html">Referrals</a></li>
              <li><a href="/auth.html" class="nav-btn">Sign In</a></li>
            </ul>
          </div>
          <div class="hamburger-menu" id="hamburger-icon" aria-controls="nav-menu" aria-expanded="false" aria-label="Toggle navigation menu" role="button" tabindex="0">
            <div class="bar"></div>
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
        </div>
      </nav>
    </header>"""

def main():
    workspace = "/home/race/race-gemini"
    for filename in FILES_TO_UPDATE:
        filepath = os.path.join(workspace, filename)
        if not os.path.exists(filepath):
            print(f"File not found: {filename}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Regex to find <header>...</header> (case-insensitive, dotall)
        header_regex = re.compile(r'<header>.*?</header>', re.IGNORECASE | re.DOTALL)
        
        if header_regex.search(content):
            new_content = header_regex.sub(NEW_HEADER, content)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filename}")
        else:
            print(f"No <header> block found in: {filename}")

if __name__ == "__main__":
    main()
