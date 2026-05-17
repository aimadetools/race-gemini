import os
import re
from pathlib import Path


def get_blog_posts():
    """Gets a sorted list of blog post files."""
    posts = sorted(
        Path("blog").glob("post*.html"),
        key=lambda p: int(re.search(r"post(\d+)\.html", str(p)).group(1)),
    )
    return posts


def get_post_title(post_path):
    """Reads a post and extracts the title from the <title> tag."""
    content = post_path.read_text()
    match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE | re.DOTALL)
    if match:
        # Clean up the title
        title = match.group(1).strip()
        # Remove the site name part
        title = title.split("|")[0].strip()
        return title
    return None


def add_internal_link(current_post_path, next_post_path):
    """Adds an internal link from the current post to the next post."""
    next_post_title = get_post_title(next_post_path)
    if not next_post_title:
        print(f"Could not find title for {next_post_path}")
        return

    current_post_content = current_post_path.read_text()

    link_to_add = f"""<section class="blog-cta">
<div class="container">
<h2>
      Ready to Generate More Local Leads?
     </h2>
<p>
      Don't let your competitors capture your local market. Get found in every town you serve!
     </p>
<div class="button-group">
<a class="button" href="../generate.html">
       Generate Your Pages Now
      </a>
<a class="button button-secondary" href="../audit.html">
       Get a Free SEO Audit
      </a>
</div>
</div>
</section>
<p>
     Read our next article on <a href="{next_post_path.name}">{next_post_title}</a>.
    </p>
"""

    if link_to_add in current_post_content:
        print(f"Link and CTA already exists in {current_post_path.name}. Skipping.")
        return

    # Find the end of the content section
    end_of_content_marker = "</main>"
    insertion_point = current_post_content.rfind(end_of_content_marker)

    if insertion_point != -1:
        link_to_add = f"""<section class="blog-cta">
<div class="container">
<h2>
      Ready to Generate More Local Leads?
     </h2>
<p>
      Don't let your competitors capture your local market. Get found in every town you serve!
     </p>
<div class="button-group">
<a class="button" href="../generate.html">
       Generate Your Pages Now
      </a>
<a class="button button-secondary" href="../audit.html">
       Get a Free SEO Audit
      </a>
</div>
</div>
</section>
<p>
     Read our next article on <a href="{next_post_path.name}">{next_post_title}</a>.
    </p>
"""
        new_content = (
            current_post_content[:insertion_point]
            + link_to_add
            + current_post_content[insertion_point:]
        )

        current_post_path.write_text(new_content)
        print(f"Added link to {next_post_path.name} in {current_post_path.name}")
    else:
        print(f"Could not find insertion point in {current_post_path.name}")


def main():
    """Main function to add internal links to all blog posts."""
    posts = get_blog_posts()
    for i in range(len(posts) - 1):
        current_post = posts[i]
        next_post = posts[i + 1]
        add_internal_link(current_post, next_post)


if __name__ == "__main__":
    main()
