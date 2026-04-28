import os
import re
import glob

def generate_blog_index():
    blog_dir = "blog/"
    blog_index_file = "blog.html"
    
    blog_dir = "blog/"
    blog_index_file = "blog.html"

    # Define fallback content
    fallback_pre_main_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blog - LocalLeads</title>
    <meta name="description" content="Stay updated with the latest in local SEO strategies, tips, and insights from LocalLeads.">
    <meta name="keywords" content="local SEO blog, SEO tips, local marketing, business growth, LocalLeads blog">
    <meta property="og:title" content="Blog - LocalLeads">
    <meta property="og:description" content="Stay updated with the latest in local SEO strategies, tips, and insights from LocalLeads.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="/blog.html">
    <link rel="canonical" href="/blog.html">
    <link rel="stylesheet" href="/style.css">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
</head>
<body>
    <header>
        <nav>
            <div class="container">
                <a href="/" class="logo">LocalLeads</a>
                <div class="hamburger-menu" id="hamburger-icon">
                    <div class="bar"></div>
                    <div class="bar"></div>
                    <div class="bar"></div>
                </div>
                <ul id="nav-menu" class="nav-links">
                    <li><a href="/generate.html">Generate Pages</a></li>
                    <li><a href="/pricing.html">Pricing</a></li>
                    <li><a href="/blog.html">Blog</a></li>
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/audit.html">Free Audit</a></li>
                    <li><a href="/contact.html">Contact</a></li>
                    <li><a href="/auth.html">Login/Signup</a></li>
                    <li><a href="/buy-credits.html">Buy Credits</a></li>
                </ul>
            </div>
        </nav>
    </header>
    <main class="container blog-list">
        <div class="blog-search-container">
            <input type="text" id="blog-search" placeholder="Search blog posts...">
        </div>
"""
    fallback_post_main_content = """
    </main>

    <div class="sticky-cta-bar">
        <p>Ready to get more local customers?</p>
        <a class="button" href="generate.html">Generate Pages Now</a>
        <a class="button button-secondary" href="audit.html">Get Free Audit</a>
    </div>
    <footer>
        <div class="container">
            <div class="footer-columns">
                <div class="footer-col">
                    <h3>LocalLeads</h3>
                    <p>Dominate your local market, effortlessly.</p>
                    <div class="social-icons">
                        <a href="https://twitter.com/LocalLeadsApp" target="_blank" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                        <a href="https://linkedin.com/company/localleads" target="_blank" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                        <a href="https://facebook.com/LocalLeadsApp" target="_blank" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    </div>
                </div>
                <div class="footer-col">
                    <h3>Quick Links</h3>
                    <ul>
                        <li><a href="about.html">About Us</a></li>
                        <li><a href="pricing.html">Pricing</a></li>
                        <li><a href="blog.html">Blog</a></li>
                        <li><a href="contact.html">Contact</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h3>Legal</h3>
                    <ul>
                        <li><a href="privacy.html">Privacy Policy</a></li>
                        <li><a href="terms.html">Terms of Service</a></li>
                        <li><a href="audit.html">Free SEO Audit</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 LocalLeads. All rights reserved.</p>
            </div>
        </div>
    </footer>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.getElementById('blog-search');
            const blogPosts = document.querySelectorAll('.blog-preview');

            searchInput.addEventListener('input', function() {
                const searchTerm = searchInput.value.toLowerCase();

                blogPosts.forEach(post => {
                    const title = post.querySelector('h2 a').textContent.toLowerCase();
                    const description = post.querySelector('p').textContent.toLowerCase();

                    if (title.includes(searchTerm) || description.includes(searchTerm)) {
                        post.style.display = ''; // Show the post
                    } else {
                        post.style.display = 'none'; // Hide the post
                    }
                });
            });
        });
    </script>
    <script src="/js/nav.js"></script>
    <script src="/js/analytics.js"></script>
    <script src="/js/scroll-to-top.js"></script>
    <script src="/js/cookie-consent.js"></script>
</body>
</html>"""

    pre_main_content = fallback_pre_main_content
    post_main_content = fallback_post_main_content

    # Read the existing blog.html to get header/footer content, if it exists
    if os.path.exists(blog_index_file):
        with open(blog_index_file, 'r', encoding='utf-8') as f:
            blog_html_template = f.read()

        main_start_tag = '<main class="container blog-list">'
        main_end_tag = '</main>'

        if main_start_tag in blog_html_template and main_end_tag in blog_html_template:
            pre_main_content = blog_html_template.split(main_start_tag, 1)[0] + main_start_tag
            post_main_content = main_end_tag + blog_html_template.split(main_end_tag, 1)[1]
        else:
            print(f"Warning: '{main_start_tag}' or '{main_end_tag}' not found in '{blog_index_file}'. Using full fallback.")
    else:
        print(f"Info: '{blog_index_file}' not found. Creating a new one with fallback content.")



    blog_posts_data = []

    # Find all blog post HTML files
    for filepath in glob.glob(os.path.join(blog_dir, "post*.html")):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

            # Extract title
            title_match = re.search(r'<title>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
            title = title_match.group(1).strip() if title_match else "Untitled Post"

            # Extract description
            description_match = re.search(r'<meta name="description" content="(.*?)"', content, re.IGNORECASE | re.DOTALL)
            description = description_match.group(1).strip() if description_match else "No description available."
            
            # Extract post number for sorting
            post_number_match = re.search(r'post(\d+)\.html', os.path.basename(filepath), re.IGNORECASE)
            post_number = int(post_number_match.group(1)) if post_number_match else 0

            blog_posts_data.append({
                "title": title,
                "description": description,
                "link": os.path.join("/", filepath), # Ensure link is absolute from root
                "post_number": post_number
            })

    # Sort posts by post number in descending order
    blog_posts_data.sort(key=lambda x: x["post_number"], reverse=True)

    # Generate HTML for the blog post list
    blog_list_html = []
    for post in blog_posts_data:
        blog_list_html.append(f"""
        <article class="blog-preview">
            <h2><a href="{post["link"]}">{post["title"]}</a></h2>
            <p>{post["description"]}</p>
            <a href="{post["link"]}" class="read-more">Read More &rarr;</a>
        </article>
        """)

    # Combine all parts and write to blog.html
    generated_blog_list_content = "\n".join(blog_list_html)
    final_blog_html = pre_main_content + generated_blog_list_content + post_main_content

    with open(blog_index_file, 'w', encoding='utf-8') as f:
        f.write(final_blog_html)
    
    print(f"Generated {len(blog_posts_data)} blog post entries in {blog_index_file}")

if __name__ == "__main__":
    generate_blog_index()
