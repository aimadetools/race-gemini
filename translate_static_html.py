import json
import os
from bs4 import BeautifulSoup

def translate_html(html_file_path, locale_data, output_dir, output_filename):
    """
    Translates an HTML file based on locale data and saves it to a new location.
    Handles text content and 'aria-label' attributes for elements with 'data-i18n-key'.
    """
    with open(html_file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Translate elements with data-i18n-key (text content)
    for element in soup.find_all(attrs={'data-i18n-key': True}):
        key = element['data-i18n-key']
        if key in locale_data:
            # Check if the element is an input/textarea with a placeholder
            if element.name in ['input', 'textarea'] and 'placeholder' in element.attrs:
                element['placeholder'] = locale_data[key]
            else:
                element.string = locale_data[key]
        
        # Translate aria-label attribute if it has a data-i18n-key
        if 'aria-label' in element.attrs and f"{key}_aria_label" in locale_data:
            element['aria-label'] = locale_data[f"{key}_aria_label"]

    # Adjust relative paths for resources moved to a subdirectory
    # We assume 'output_dir' is a direct subdirectory of the base
    # (e.g., 'es/' for 'index.html' -> 'es/index.html')
    for tag in soup.find_all(['a', 'link', 'img']):
        if tag.has_attr('href'):
            attr_name = 'href'
        elif tag.has_attr('src'):
            attr_name = 'src'
        else:
            continue

        url = tag[attr_name]
        
        # Only modify internal, non-absolute (starting with // or http) links
        # and not links that are already pointing to the same directory (e.g. #anchor)
        if url and not (url.startswith('//') or url.startswith('http://') or url.startswith('https://') or url.startswith('#') or url.startswith('tel:') or url.startswith('mailto:')):
            # If the URL starts with '/', it's an absolute path from the root.
            # We need to make it relative to the new subdirectory.
            if url.startswith('/'):
                # Handle cases like /style.min.css -> ../style.min.css
                # or /generate.html -> ../generate.html
                # Remove the leading '/' and prepend '../'
                new_url = f"../{url.lstrip('/')}"
            # If the URL is already relative and refers to something in the root,
            # it also needs '../' prepended.
            # This is tricky because some relative paths might be to resources *within* the subdirectory.
            # For simplicity, assuming any relative path that doesn't start with a known subdirectory
            # (e.g., 'blog/') should also be prepended with '../' if it's meant to be in the root.
            # The most common case here is CSS files like 'style.min.css' or 'style_scroll_to_top.min.css'.
            elif not '/' in url and url.endswith(('.css', '.js', '.png', '.jpg', '.html')): # Simple filenames usually reside at root
                 new_url = f"../{url}"
            else:
                # Other relative paths (e.g., ../images/...) might be correct already
                # or require more complex path resolution. For now, we'll leave them.
                new_url = url 

            if new_url != url:
                tag[attr_name] = new_url
                # print(f"  Adjusted link in {output_filename}: {url} -> {new_url}")

    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    output_file_path = os.path.join(output_dir, output_filename)
    with open(output_file_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))
    print(f"Translated '{html_file_path}' to '{output_file_path}'")

def main():
    # Load locale data
    with open('locales/en.json', 'r', encoding='utf-8') as f:
        en_locale = json.load(f)
    with open('locales/es.json', 'r', encoding='utf-8') as f:
        es_locale = json.load(f)

    # Define files to translate and their output paths
    html_files_to_translate = [
        'index.html',
        'about.html',
        'pricing.html',
        'contact.html',
        'audit.html',
        'generate.html',
        'blog.html', # Added blog.html
    ]
    
    # Translate to Spanish
    for html_file in html_files_to_translate:
        translate_html(html_file, es_locale, 'es', html_file)

if __name__ == "__main__":
    main()
