import os
from datetime import datetime

def generate_blog_post_html(post_number, title, description, keywords, image_url, canonical_url, content):
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
     This is placeholder content for the blog post titled "{title}".
     It discusses {description}. More detailed content will be added here soon.
     Topics covered include: {keywords}.
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
<h3>
       LocalLeads
      </h3>
<p>
       Dominate your local market, effortlessly.
      </p>
<div class="social-icons">
<a aria-label="Twitter" href="https://twitter.com/intent/tweet?url=https://www.localleads.pro&amp;text=LocalLeads - Get Found in Every Town" target="_blank">
<i class="fab fa-twitter">
</i>
</a>
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
<h3>
       Quick Links
      </h3>
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
<h3>
       Legal
      </h3>
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
    
    for i in range(count):
        post_number = start_num + i
        title = f"Local SEO Strategy for {post_number}"
        description = f"Explore effective local SEO strategies tailored for small businesses to dominate search results in their local market. This is a placeholder description for post {post_number}."
        keywords = f"local seo, small business seo, local marketing, {post_number}"
        image_url = f"https://www.localleads.com/images/og_webp/post{post_number}.webp"
        canonical_url = f"https://www.localleads.pro/blog/post{post_number}.html"
        content = f"This blog post provides an in-depth look into optimizing your business for local search, focusing on techniques that drive organic traffic and convert local customers. Key areas include Google My Business optimization, local citation building, and reputation management. This is the main content for post {post_number}."
        
        file_name = os.path.join(blog_dir, f"post{post_number}.html")
        
        if os.path.exists(file_name):
            print(f"Skipping existing file: {file_name}")
            continue

        html_content = generate_blog_post_html(post_number, title, description, keywords, image_url, canonical_url, content)
        
        with open(file_name, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Created new blog post: {file_name}")

if __name__ == "__main__":
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
    num_posts_to_generate = 10
    
    print(f"Generating {num_posts_to_generate} new blog posts starting from post{start_post_number}.html...")
    create_new_blog_posts(start_post_number, num_posts_to_generate)
