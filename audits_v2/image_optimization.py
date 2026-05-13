import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

class ImageOptimizationAudit:
    def __init__(self, url):
        self.url = url
        self.findings = []

    def run_audit(self):
        print(f"Running Image Optimization Audit for: {self.url}")
        try:
            response = requests.get(self.url, timeout=10)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            self._check_images(soup)
        except requests.exceptions.RequestException as e:
            self.findings.append(f"Error fetching URL {self.url}: {e}")
        except Exception as e:
            self.findings.append(f"An unexpected error occurred: {e}")
        
        return self.findings

    def _check_images(self, soup):
        images = soup.find_all('img')
        if not images:
            self.findings.append("No <img> tags found on the page.")
            return

        for img_tag in images:
            src = img_tag.get('src')
            if not src:
                self.findings.append(f"Image tag found with no 'src' attribute: {img_tag}")
                continue
            
            # Resolve relative URLs
            absolute_src = urljoin(self.url, src)

            # Check for alt attribute
            alt_text = img_tag.get('alt')
            if not alt_text or alt_text.strip() == '':
                self.findings.append(f"Missing or empty 'alt' attribute for image: {absolute_src}")

            # Check for modern formats (e.g., WebP suggestion)
            # This is a basic check and can be improved
            if not absolute_src.lower().endswith(('.webp', '.svg', '.gif')): # Allow SVG/GIF as they are often optimized
                self.findings.append(f"Consider using modern image formats (like WebP) for image: {absolute_src}")

            # Future improvement: Check image file size (requires fetching image headers or content)
            # For this CHEAP task, we'll keep it simple for now.

if __name__ == "__main__":
    # Example usage:
    test_url = "https://www.example.com" # Replace with a real URL for testing
    audit = ImageOptimizationAudit(test_url)
    results = audit.run_audit()
    for finding in results:
        print(f"- {finding}")
