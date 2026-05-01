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
