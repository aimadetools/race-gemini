import os
import re
import glob

def generate_blog_index():
    blog_dir = "blog/"
    blog_index_file = "blog.html"
    
    # Read the existing blog.html to get header/footer content
    with open(blog_index_file, 'r', encoding='utf-8') as f:
        blog_html_template = f.read()

    # Split the template into before and after the main content section
    main_start_tag = '<main class="container blog-list">'
    main_end_tag = '</main>'
    
    pre_main_content = ""
    post_main_content = ""

    if main_start_tag in blog_html_template and main_end_tag in blog_html_template:
        pre_main_content = blog_html_template.split(main_start_tag, 1)[0] + main_start_tag
        post_main_content = main_end_tag + blog_html_template.split(main_end_tag, 1)[1]
    else:
        # Fallback if the main tags are not exactly as expected, or for first run
        # This will wrap the entire generated content in main tags
        print(f"Warning: '{main_start_tag}' or '{main_end_tag}' not found in '{blog_index_file}'. Generating full file.")
        pre_main_content = """<!DOCTYPE html>
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
    <meta property="og:url" content="https://www.localleads.com/blog.html">
    <link rel="canonical" href="https://www.localleads.com/blog.html">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <nav>
            <div class="container">
                <a href="/" class="logo">LocalLeads</a>
                <ul class="nav-links">
                    <li><a href="/generate.html">Generate Pages</a></li>
                    <li><a href="/pricing.html">Pricing</a></li>
                    <li><a href="/blog.html">Blog</a></li>
                    <li><a href="/about.html">About</a></li>
                    <li><a href="/audit.html">Free Audit</a></li>
                    <li><a href="/auth.html">Login/Signup</a></li>
                    <li><a href="/buy-credits.html">Buy Credits</a></li>
                </ul>
            </div>
        </nav>
    </header>
    <main class="container blog-list">
"""
        post_main_content = """
    </main>

    <footer>
        <div class="container">
            <p>&copy; 2026 LocalLeads. All rights reserved.</p>
        </div>
    </footer>
    <script src="/js/nav.js"></script>
</body>
</html>"""


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
