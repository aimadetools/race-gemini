
import re
import os
import json

def process_blog_post(file_path, keyword_mappings):
    """
    Processes a single blog post HTML file to add internal links.

    Args:
        file_path (str): The path to the HTML file.
        keyword_mappings (list): A list of dictionaries, each with 'keyword' and 'link'.

    Returns:
        bool: True if the file was modified, False otherwise.
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    modified = False
    
    # Regex to find the <section class="blog-content"> block
    blog_content_pattern = re.compile(r'(<section class="blog-content">)(.*?)(</section>)', re.DOTALL | re.IGNORECASE)
    match = blog_content_pattern.search(html_content)

    if not match:
        return False # No blog-content section found

    prefix = match.group(1) # The opening <section> tag
    blog_content_inner = match.group(2) # The content inside the section
    suffix = match.group(3) # The closing </section> tag

    original_blog_content_inner = blog_content_inner

    for mapping in keyword_mappings:
        keyword = mapping["keyword"]
        link_url = mapping["link"]
        
        # Flag to ensure only one link per keyword per blog post
        linked_this_keyword = False

        # Split the content by existing <a> tags (capturing the <a> tags themselves)
        # This allows us to process text outside existing links
        parts = re.split(r'(<a[^>]*?>.*?</a>)', blog_content_inner, flags=re.IGNORECASE | re.DOTALL)
        
        new_parts = []
        for i, part in enumerate(parts):
            if i % 2 == 1: # This is an existing <a> tag, add it back as is
                new_parts.append(part)
            else: # This is text outside of <a> tags, process it for keyword linking
                if not linked_this_keyword:
                    # Find the first occurrence of the keyword in this part
                    keyword_pattern = re.compile(re.escape(keyword), re.IGNORECASE)
                    
                    # Need to search manually to find the first occurrence and preserve case
                    search_match = keyword_pattern.search(part)
                    
                    if search_match:
                        original_match_text = search_match.group(0) # Preserve original casing
                        replacement = f'<a href="{link_url}">{original_match_text}</a>'
                        
                        # Replace only this specific occurrence
                        part = part[:search_match.start()] + replacement + part[search_match.end():]
                        linked_this_keyword = True # Mark as linked for this keyword

                new_parts.append(part)
                
        blog_content_inner = "".join(new_parts)
    
    if blog_content_inner != original_blog_content_inner:
        final_html_content = html_content.replace(original_blog_content_inner, blog_content_inner, 1)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(final_html_content)
        modified = True

    return modified

if __name__ == "__main__":
    # Get file paths and keyword mappings from environment variables or direct arguments if preferred
    # For now, hardcode for testing and then pass via JSON
    file_paths_str = os.environ.get('BLOG_FILE_PATHS', '[]')
    keyword_mappings_str = os.environ.get('KEYWORD_MAPPINGS', '[]')

    file_paths = json.loads(file_paths_str)
    keyword_mappings = json.loads(keyword_mappings_str)

    # Example keyword mappings structure (as received from user)
    # keyword_mappings = [
    #     {"keyword": "LocalLeads", "link": "../index.html"},
    #     {"keyword": "local SEO", "link": "../index.html"},
    #     {"keyword": "generate pages", "link": "../generate.html"},
    #     {"keyword": "free audit", "link": "../audit.html"},
    #     {"keyword": "pricing plans", "link": "../pricing.html"},
    # ]

    changed_files = []
    for fp in file_paths:
        if process_blog_post(fp, keyword_mappings):
            changed_files.append(fp)
    
    # Output the list of changed files as a JSON string
    print(json.dumps(changed_files))
