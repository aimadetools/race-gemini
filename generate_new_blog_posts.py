import argparse
import os
import requests
import json
from datetime import datetime

# Function to call the Gemini API
def call_gemini_api(prompt, api_key):
    if not api_key:
        print(f"Warning: GEMINI_API_KEY not set. Generating placeholder content for '{prompt.splitlines()[0][:50]}...'")
        return None

    headers = {
        "Content-Type": "application/json"
    }
    params = {
        "key": api_key
    }
    data = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }
    
    try:
        response = requests.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
            headers=headers,
            params=params,
            json=data,
            timeout=30 # Add a timeout for the request
        )
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        
        response_json = response.json()
        if "candidates" in response_json and len(response_json["candidates"]) > 0:
            return response_json["candidates"][0]["content"]["parts"][0]["text"]
        else:
            print(f"Gemini API did not return content for prompt: {prompt}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error calling Gemini API: {e}")
        return None

def generate_blog_post_html(title, description, keywords, image_url, canonical_url, content):
    current_date = datetime.now().isoformat()
    html_template = f"""<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>
   {title} | LocalLeads Blog
  </title>
<meta content="{description}" name="description"/>
<meta content="{keywords}" name="keywords"/>
<meta content="{title} | LocalLeads Blog" property="og:title"/>
<meta content="{description}" property="og:description"/>
<meta content="{image_url}" property="og:image"/>
<meta content="{canonical_url}" property="og:url"/>
<meta content="summary_large_image" name="twitter:card"/>
<meta content="{title} | LocalLeads Blog" name="twitter:title"/>
<meta content="{description}" name="twitter:description"/>
<link rel="canonical" href="{canonical_url}"/>
<link href="../style.css" rel="stylesheet"/>
<link href="/images/favicon.png" rel="icon" type="image/png"/>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet"/>
<script class="article-schema" type="application/ld+json">{{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title} | LocalLeads Blog",
  "image": [
    "{image_url}"
  ],
  "datePublished": "{current_date}",
  "dateModified": "{current_date}",
  "author": {{
    "@type": "Organization",
    "name": "LocalLeads Team"
  }},
  "publisher": {{
    "@type": "Organization",
    "name": "LocalLeads",
    "logo": {{
      "@type": "ImageObject",
      "url": "https://www.localleads.com/images/localleads-logo.png"
    }}
  }},
  "description": "{description}",
  "mainEntityOfPage": {{
    "@type": "WebPage",
    "@id": "{canonical_url}"
  }},
  "articleBody": "{content}"
}}</script></head>
<body><div id="mobile-nav-overlay">
</div>
<header>
<nav>
<div class="container">
<a class="logo" href="../index.html">LocalLeads</a>
<div aria-controls="nav-menu" aria-expanded="false" aria-label="Toggle navigation menu" class="hamburger-menu" id="hamburger-icon" role="button">
<div class="bar"></div>
<div class="bar"></div>
<div class="bar"></div>
</div>
</div>
<div class="mobile-menu-container">
<button class="close-menu-btn" id="close-menu-btn">
<i class="fas fa-times"></i>
</button>
<ul class="nav-links" id="nav-menu">
<li><a data-i18n-key="header_generate_pages" href="../generate.html">Generate Pages</a></li>
<li><a data-i18n-key="header_pricing" href="../pricing.html">Pricing</a></li>
<li><a data-i18n-key="header_blog" href="../blog.html">Blog</a></li>
<li><a data-i18n-key="header_about" href="../about.html">About</a></li>
<li><a data-i18n-key="header_audit" href="../audit.html">Free Audit</a></li>
<li><a data-i18n-key="header_contact" href="../contact.html">Contact</a></li>
<li><a data-i18n-key="header_login_signup" href="../auth.html">Login/Signup</a></li>
<li><a data-i18n-key="header_buy_credits" href="../buy-credits.html">Buy Credits</a></li>
</ul>
</div>
</nav>
</header>
<main>
<section class="hero">
<h1>
     {title}
    </h1>
</section>
<section class="blog-content">
<p>
     {content}
    </p>
</section>
<div class="social-share" id="social-share-container">
</div>
<div class="social-share" id="social-share-container">
</div>
</main>
<footer>
<div class="container">
<div class="footer-columns">
<div class="footer-col">
       <strong>
       LocalLeads
      </strong>
<p>
       Dominate your local market, effortlessly.
      </p>
<div class="social-icons">

<a aria-label="Facebook" href="https://www.facebook.com/sharer/sharer.php?u=https://www.localleads.pro" target="_blank">
<i class="fab fa-facebook-f">
</i>
</a>
<a aria-label="LinkedIn" href="https://www.linkedin.com/shareArticle?mini=true&amp;url=https://www.localleads.pro&amp;title=LocalLeads - Get Found in Every Town" target="_blank">
<i class="fab fa-linkedin-in">
</i>
</a>
</div>
</div>
<div class="footer-col">
       <strong>
       Quick Links
      </strong>
<ul>
<li>
<a href="/about.html">
         About Us
        </a>
</li>
<li>
<a href="/pricing.html">
         Pricing
        </a>
</li>
<li>
<a href="/blog.html">
         Blog
        </a>
</li>
<li>
<a href="/contact.html">
         Contact
        </a>
</li>
</ul>
</div>
<div class="footer-col">
       <strong>
       Legal
      </strong>
<ul>
<li>
<a href="/privacy.html">
         Privacy Policy
        </a>
</li>
<li>
<a href="/terms.html">
         Terms of Service
        </a>
</li>
<li>
<a href="/audit.html">
         Free SEO Audit
        </a>
</li>
</ul>
</div>
</div>
<div class="footer-bottom">
<p>
      © 2026 LocalLeads. All rights reserved.
     </p>
</div>
</div>
</footer>
<script src="/js/app.js">
</script>
<script src="/js/blog-search.js"></script>
</body>
</html>"""
    return html_template


def create_new_blog_posts(start_num, count):
    blog_dir = "blog"
    os.makedirs(blog_dir, exist_ok=True)
    
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not gemini_api_key:
        print("\n" + "="*80)
        print("WARNING: GEMINI_API_KEY environment variable is NOT set.")
        print("LLM content generation for blog posts will be skipped.")
        print("Placeholder content will be used instead.")
        print("To generate real content, please set the GEMINI_API_KEY environment variable.")
        print("="*80 + "\n")

    for i in range(count):
        post_number = start_num + i
        
        file_name = os.path.join(blog_dir, f"post{post_number}.html")
        
        if os.path.exists(file_name):
            print(f"Skipping existing file: {file_name}")
            continue

        # Define a base topic for the blog post
        base_topic = "Local SEO for small businesses"

        # Generate Title
        title_prompt = f"Generate a catchy and SEO-friendly blog post title (under 70 characters) about {base_topic}. Make it unique and engaging."
        llm_title = call_gemini_api(title_prompt, gemini_api_key)
        title = llm_title if llm_title else f"Local SEO Strategy for {post_number}"
        # Clean up title: remove quotes if LLM adds them
        title = title.strip('\'"')

        # Generate Description
        description_prompt = f"Write a concise, engaging, and SEO-optimized meta description (under 160 characters) for a blog post titled '{title}'. Focus on how small businesses can attract local customers with effective SEO."
        llm_description = call_gemini_api(description_prompt, gemini_api_key)
        description = llm_description if llm_description else f"Discover effective local SEO strategies to help small businesses attract customers and rank higher in local search. This is a concise overview for post {post_number}."
        description = description.strip('\'"') # Clean up description

        # Generate Keywords
        keywords_prompt = f"List 5-10 relevant and high-traffic keywords for a blog post titled '{title}' focusing on local SEO for small businesses. Separate with commas."
        llm_keywords = call_gemini_api(keywords_prompt, gemini_api_key)
        keywords = llm_keywords if llm_keywords else f"local seo, small business seo, local marketing, {post_number}"
        keywords = keywords.strip('\'"') # Clean up keywords
        
        # Generate Content
        content_prompt = f"Write a detailed and informative blog post (approximately 500-800 words) about '{title}'. Include sections on why local SEO is important, key strategies (e.g., Google My Business, local citations, reviews), and actionable advice for small businesses. Ensure the tone is helpful and professional. Incorporate 2-3 relevant external links (e.g., to Google's official guides, reputable SEO blogs) naturally within the text. Format the content with paragraphs and headings (using Markdown #, ##, ### for structure)."
        llm_content = call_gemini_api(content_prompt, gemini_api_key)
        
        # Convert Markdown content to HTML paragraphs for the template
        if llm_content:
            # Simple conversion from Markdown-like headings to HTML h-tags and paragraphs
            # This is a basic conversion, a proper Markdown parser would be better for complex Markdown
            html_content_body = []
            for line in llm_content.split('\n'):
                line = line.strip()
                if line.startswith('### '):
                    html_content_body.append(f"<h3>{line[4:].strip()}</h3>")
                elif line.startswith('## '):
                    html_content_body.append(f"<h2>{line[3:].strip()}</h2>")
                elif line.startswith('# '):
                    html_content_body.append(f"<h1>{line[2:].strip()}</h1>")
                elif line: # Any non-empty line becomes a paragraph
                    html_content_body.append(f"<p>{line}</p>")
            content = "\n".join(html_content_body)
        else:
            content = f"This blog post provides an in-depth look into optimizing your business for local search, focusing on techniques that drive organic traffic and convert local customers. Key areas include Google My Business optimization, local citation building, and reputation management. This is the main content for post {post_number}."


        image_url = f"https://www.localleads.pro/images/og_webp/post{post_number}.webp" # Placeholder for now, could be LLM generated
        canonical_url = f"https://www.localleads.pro/blog/post{post_number}.html"
        
        html_content = generate_blog_post_html(title, description, keywords, image_url, canonical_url, content)
        
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Created new blog post: {file_name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate new blog posts.")
    parser.add_argument("--count", type=int, default=3,
                        help="Number of new blog posts to generate (default: 3).")
    args = parser.parse_args()

    # Find the highest existing post number
    blog_files = [f for f in os.listdir("blog") if f.startswith("post") and f.endswith(".html")]
    max_post_num = 0
    for file_name in blog_files:
        try:
            num = int(file_name.replace("post", "").replace(".html", ""))
            if num > max_post_num:
                max_post_num = num
        except ValueError:
            continue
    
    start_post_number = max_post_num + 1
    num_posts_to_generate = args.count
    
    print(f"Generating {num_posts_to_generate} new blog posts starting from post{start_post_number}.html...")
    create_new_blog_posts(start_post_number, num_posts_to_generate)

