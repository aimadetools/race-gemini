import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

class ImageOptimizationAudit:
    """
    Audits a given URL for image optimization best practices, including:
    - Presence of 'alt' attributes for accessibility.
    - Suggestion to use modern image formats (e.g., WebP).
    - Identification of large image file sizes.
    """
    def __init__(self, url):
        self.url = url
        self.findings = []

    def run_audit(self):
        """
        Executes the image optimization audit by fetching the URL content
        and checking all image tags for optimization issues.

        Returns:
            list: A list of findings, including errors and optimization recommendations.
        """
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
        """
        Finds all image tags in the parsed HTML and checks them for optimization issues.

        Args:
            soup (BeautifulSoup): The BeautifulSoup object of the parsed HTML.
        """
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
            self._check_image_size(absolute_src)

    def _check_image_size(self, image_url, threshold_kb=100):
        """
        Checks the file size of an image at the given URL against a specified threshold.

        Args:
            image_url (str): The absolute URL of the image.
            threshold_kb (int): The maximum allowed image size in kilobytes.
        """
        try:
            head_response = requests.head(image_url, timeout=5)
            head_response.raise_for_status()
            content_length = head_response.headers.get('Content-Length')
            if content_length:
                size_bytes = int(content_length)
                size_kb = size_bytes / 1024
                if size_kb > threshold_kb:
                    self.findings.append(f"Image is large ({size_kb:.2f} KB > {threshold_kb} KB): {image_url}")
            else:
                self.findings.append(f"Could not determine size for image (no Content-Length header): {image_url}")
        except requests.exceptions.RequestException as e:
            # Handle cases where HEAD request fails (e.g., resource not found, connection error)
            self.findings.append(f"Could not check size for image {image_url}: {e}")

if __name__ == "__main__":
    # Example usage:
    test_url = "https://www.example.com" # Replace with a real URL for testing
    audit = ImageOptimizationAudit(test_url)
    results = audit.run_audit()
    for finding in results:
        print(f"- {finding}")
