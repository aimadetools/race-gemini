import asyncio
from playwright.async_api import async_playwright
import os
import time

# Configuration
SCREENSHOT_DIR = "screenshots/product-hunt"
BASE_URL = "https://www.localleads.pro" # Using the deployed site

PAGES_TO_SCREENSHOT = {
    "homepage": {
        "url": f"{BASE_URL}/index.html",
        "wait_until": "domcontentloaded",
        "timeout": 60000
    },
    "seo-page-generator": {
        "url": f"{BASE_URL}/seo-page-generator.html",
        "wait_until": "domcontentloaded",
        "timeout": 60000
    },
    "sample-generated-page": {
        "url": f"{BASE_URL}/sample-pages/evergreen-plumbing-solutions-austin-page-1.html",
        "wait_until": "domcontentloaded",
        "timeout": 60000
    },
}

async def generate_screenshots():
    if not os.path.exists(SCREENSHOT_DIR):
        os.makedirs(SCREENSHOT_DIR)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        for name, page_info in PAGES_TO_SCREENSHOT.items():
            url = page_info["url"]
            wait_until = page_info["wait_until"]
            timeout = page_info["timeout"]
            print(f"Navigating to {url} (wait_until={wait_until}, timeout={timeout/1000}s)")
            try:
                await page.goto(url, wait_until=wait_until, timeout=timeout)
                screenshot_path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
                await page.screenshot(path=screenshot_path, full_page=True)
                print(f"Screenshot saved to {screenshot_path}")
            except Exception as e:
                print(f"Could not take screenshot for {name} at {url}: {e}")
        await browser.close()

if __name__ == "__main__":
    # No need to wait for local server
    asyncio.run(generate_screenshots())
    print("Screenshot generation complete.")
