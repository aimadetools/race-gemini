
import os
import re

def extract_broken_image_paths(log_output):
    """
    Extracts unique broken image file paths from the log output of check_internal_links.py.
    """
    broken_image_paths = set()
    # Regex to capture the target path for broken images
    # Example: Broken image (img src): ../images/blog/post255.webp -> images/blog/post255.webp (from blog/post255.html)
    # Example: Broken image (img src): /images/blog/hair-salon-seo.webp -> /home/race/race-gemini/images/blog/hair-salon-seo.webp (from blog/post219.html)
    # We want the resolved path, which is the second part of the '->'
    
    # Updated regex to specifically capture the target path after '->'
    pattern = re.compile(r"Broken image \(img src\): .*? -> (.*?) \(from .*?\)")

    for line in log_output.splitlines():
        match = pattern.search(line)
        if match:
            # The captured group (1) is the resolved target path
            full_path = match.group(1).strip()
            # Remove the project root path if present to get the relative path from project root
            # Assuming project root is /home/race/race-gemini/
            project_root = os.getcwd() # Get current working directory dynamically
            if full_path.startswith(project_root):
                relative_path = full_path[len(project_root) + 1:] # +1 for the leading slash
            else:
                relative_path = full_path
            
            # Ensure it's a file path, not a directory. 
            # Some paths might be just image/blog which we want to ignore.
            if os.path.basename(relative_path) != "":
                broken_image_paths.add(relative_path)
    return sorted(list(broken_image_paths))

def create_placeholder_images(image_paths):
    """
    Creates placeholder text files for a list of given image paths.
    """
    created_count = 0
    for path in image_paths:
        # Construct the full path
        full_path = os.path.join(os.getcwd(), path)
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Create a placeholder file if it doesn't exist
        if not os.path.exists(full_path):
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(f"# Placeholder for missing image: {os.path.basename(path)}
")
            print(f"Created placeholder: {full_path}")
            created_count += 1
    return created_count

def main():
    # Output from the last check_internal_links.py run (manually copied)
    log_output = """Output: Checking 481 HTML files for broken internal links...

--- BROKEN LINKS FOUND ---

In file: blog/post52.html
  - Broken image (img src): ../images/local-seo-audit-2026.webp -> images/local-seo-audit-2026.webp (from blog/post52.html)

In file: blog/post255.html
  - Broken image (img src): ../images/blog/post255.webp -> images/blog/post255.webp (from blog/post255.html)

In file: blog/post139.html
  - Broken image (img src): ../images/blog139.webp -> images/blog139.webp (from blog/post139.html)

In file: blog/post289.html
  - Broken image (img src): ../images/blog/post289.webp -> images/blog/post289.webp (from blog/post289.html)

In file: blog/post219.html
  - Broken image (img src): /images/blog/hair-salon-seo.webp -> /home/race/race-gemini/images/blog/hair-salon-seo.webp (from blog/post219.html)

In file: blog/post138.html
  - Broken image (img src): ../images/blog138.webp -> images/blog138.webp (from blog/post138.html)

In file: blog/post127.html
  - Broken image (img src): ../images/blog127.webp -> images/blog127.webp (from blog/post127.html)

In file: blog/post360.html
  - Broken image (img src): ../images/blog/post360.webp -> images/blog/post360.webp (from blog/post360.html)

In file: blog/post215.html
  - Broken image (img src): ../images/blog/arts_entertainment_seo.webp -> images/blog/arts_entertainment_seo.webp (from blog/post215.html)

In file: blog/post376.html
  - Broken image (img src): ../images/blog/post376.webp -> images/blog/post376.webp (from blog/post376.html)

In file: blog/post357.html
  - Broken image (img src): ../images/blog/post357.webp -> images/blog/post357.webp (from blog/post357.html)

In file: blog/post254.html
  - Broken image (img src): ../images/blog/post254.webp -> images/blog/post254.webp (from blog/post254.html)

In file: blog/post358.html
  - Broken image (img src): ../images/blog/post358.webp -> images/blog/post358.webp (from blog/post358.html)

In file: blog/post286.html
  - Broken image (img src): ../images/blog/post286.webp -> images/blog/post286.webp (from blog/post286.html)

In file: blog/post230.html
  - Broken image (img src): ../images/blog/post230.webp -> images/blog/post230.webp (from blog/post230.html)

In file: blog/post12.html
  - Broken link (a href): blog/post3.html -> blog/blog/post3.html (from blog/post12.html)
  - Broken link (a href): blog/post2.html -> blog/blog/post2.html (from blog/post12.html)
  - Broken link (a href): blog/post1.html -> blog/blog/post1.html (from blog/post12.html)

In file: blog/post253.html
  - Broken image (img src): ../images/blog/post253.webp -> images/blog/post253.webp (from blog/post253.html)

In file: blog/post244.html
  - Broken image (img src): ../images/blog/post244.webp -> images/blog/post244.webp (from blog/post244.html)

In file: blog/post277.html
  - Broken image (img src): ../images/blog/post277.webp -> images/blog/post277.webp (from blog/post277.html)

In file: blog/post378.html
  - Broken image (img src): ../images/blog/post378.webp -> images/blog/post378.webp (from blog/post378.html)

In file: blog/post241.html
  - Broken image (img src): ../images/blog/post241.webp -> images/blog/post241.webp (from blog/post241.html)

In file: blog/post227.html
  - Broken image (img src): ../images/blog/post227.webp -> images/blog/post227.webp (from blog/post227.html)

In file: blog/post364.html
  - Broken image (img src): ../images/blog/post364.webp -> images/blog/post364.webp (from blog/post364.html)

In file: blog/post233.html
  - Broken image (img src): ../images/blog/post233.webp -> images/blog/post233.webp (from blog/post233.html)

In file: blog/post336.html
  - Broken image (img src): ../images/blog/post336.webp -> images/blog/post336.webp (from blog/post336.html)

In file: blog/post10.html
  - Broken link (a href): blog/post3.html -> blog/blog/post3.html (from blog/post10.html)
  - Broken link (a href): blog/post2.html -> blog/blog/post2.html (from blog/post10.html)
  - Broken link (a href): blog/post1.html -> blog/blog/post1.html (from blog/post10.html)

In file: blog/post236.html
  - Broken image (img src): ../images/blog/post236.webp -> images/blog/post236.webp (from blog/post236.html)

In file: blog/post261.html
  - Broken image (img src): ../images/blog/post261.webp -> images/blog/post261.webp (from blog/post261.html)

In file: blog/post367.html
  - Broken image (img src): ../images/blog/post367.webp -> images/blog/post367.webp (from blog/post367.html)

In file: blog/post88.html
  - Broken image (img src): ../images/blog88_hero.webp -> images/blog88_hero.webp (from blog/post88.html)

In file: blog/post351.html
  - Broken image (img src): ../images/blog/post351.webp -> images/blog/post351.webp (from blog/post351.html)

In file: blog/post385.html
  - Broken image (img src): ../images/blog/post385.webp -> images/blog/post385.webp (from blog/post385.html)

In file: blog/post284.html
  - Broken image (img src): ../images/blog/post284.webp -> images/blog/post284.webp (from blog/post284.html)

In file: blog/post238.html
  - Broken image (img src): ../images/blog/post238.webp -> images/blog/post238.webp (from blog/post238.html)

In file: blog/post222.html
  - Broken image (img src): /images/blog/architects-seo.webp -> /home/race/race-gemini/images/blog/architects-seo.webp (from blog/post222.html)

In file: blog/post264.html
  - Broken image (img src): ../images/blog/post264.webp -> images/blog/post264.webp (from blog/post264.html)

In file: blog/post272.html
  - Broken image (img src): ../images/blog/post272.webp -> images/blog/post272.webp (from blog/post272.html)

In file: blog/post382.html
  - Broken image (img src): ../images/blog/post382.webp -> images/blog/post382.webp (from blog/post382.html)

In file: blog/post366.html
  - Broken image (img src): ../images/blog/post366.webp -> images/blog/post366.webp (from blog/post366.html)

In file: blog/post268.html
  - Broken image (img src): ../images/blog/post268.webp -> images/blog/post268.webp (from blog/post268.html)

In file: blog/post362.html
  - Broken image (img src): ../images/blog/post362.webp -> images/blog/post362.webp (from blog/post362.html)

In file: blog/post265.html
  - Broken image (img src): ../images/blog/post265.webp -> images/blog/post265.webp (from blog/post265.html)

In file: blog/post247.html
  - Broken image (img src): ../images/blog/post247.webp -> images/blog/post247.webp (from blog/post247.html)

In file: blog/post381.html
  - Broken image (img src): ../images/blog/post381.webp -> images/blog/post381.webp (from blog/post381.html)

In file: blog/post256.html
  - Broken image (img src): ../images/blog/post256.webp -> images/blog/post256.webp (from blog/post256.html)

In file: blog/post348.html
  - Broken image (img src): ../images/blog/post348.webp -> images/blog/post348.webp (from blog/post348.html)

In file: blog/post258.html
  - Broken image (img src): ../images/blog/post258.webp -> images/blog/post258.webp (from blog/post258.html)

In file: blog/post346.html
  - Broken image (img src): ../images/blog/post346.webp -> images/blog/post346.webp (from blog/post346.html)

In file: blog/post354.html
  - Broken image (img src): ../images/blog/post354.webp -> images/blog/post354.webp (from blog/post354.html)

In file: blog/post245.html
  - Broken image (img src): ../images/blog/post245.webp -> images/blog/post245.webp (from blog/post245.html)

In file: blog/post225.html
  - Broken image (img src): ../images/blog/post225.webp -> images/blog/post225.webp (from blog/post225.html)

In file: blog/post370.html
  - Broken image (img src): ../images/blog/post370.webp -> images/blog/post370.webp (from blog/post370.html)

In file: blog/post350.html
  - Broken image (img src): ../images/blog/post350.webp -> images/blog/post350.webp (from blog/post350.html)

In file: blog/post365.html
  - Broken image (img src): ../images/blog/post365.webp -> images/blog/post365.webp (from blog/post365.html)

In file: blog/post221.html
  - Broken image (img src): /images/blog/artisans-crafters-seo.webp -> /home/race/race-gemini/images/blog/artisans-crafters-seo.webp (from blog/post221.html)

In file: blog/post273.html
  - Broken image (img src): ../images/blog/post273.webp -> images/blog/post273.webp (from blog/post273.html)

In file: blog/post13.html
  - Broken link (a href): blog/post3.html -> blog/blog/post3.html (from blog/post13.html)
  - Broken link (a href): blog/post2.html -> blog/blog/post2.html (from blog/post13.html)
  - Broken link (a href): blog/post1.html -> blog/blog/post1.html (from blog/post13.html)

In file: blog/post7.html
  - Broken image (img src): ../images/blog/citations-seo-banner.webp -> images/blog/citations-seo-banner.webp (from blog/post7.html)

In file: blog/post11.html
  - Broken link (a href): blog/post3.html -> blog/blog/post3.html (from blog/post11.html)
  - Broken link (a href): blog/post2.html -> blog/blog/post2.html (from blog/post11.html)
  - Broken link (a href): blog/post1.html -> blog/blog/post1.html (from blog/post11.html)

In file: blog/post288.html
  - Broken image (img src): ../images/blog/post288.webp -> images/blog/post288.webp (from blog/post288.html)

In file: blog/post372.html
  - Broken image (img src): ../images/blog/post372.webp -> images/blog/post372.webp (from blog/post372.html)

In file: blog/post269.html
  - Broken image (img src): ../images/blog/post269.webp -> images/blog/post269.webp (from blog/post269.html)

In file: blog/post223.html
  - Broken image (img src): /images/blog/moving-companies-seo.webp -> /home/race/race-gemini/images/blog/moving-companies-seo.webp (from blog/post223.html)

In file: blog/post260.html
  - Broken image (img src): ../images/blog/post260.webp -> images/blog/post260.webp (from blog/post260.html)

In file: blog/post59.html
  - Broken image (img src): ../images/local-seo-service-business-2026.webp -> images/local-seo-service-business-2026.webp (from blog/post59.html)

In file: blog/post355.html
  - Broken image (img src): ../images/blog/post355.webp -> images/blog/post355.webp (from blog/post355.html)

In file: blog/post267.html
  - Broken image (img src): ../images/blog/post267.webp -> images/blog/post267.webp (from blog/post267.html)

In file: blog/post250.html
  - Broken image (img src): ../images/blog/post250.webp -> images/blog/post250.webp (from blog/post250.html)

In file: blog/post235.html
  - Broken image (img src): ../images/blog/post235.webp -> images/blog/post235.webp (from blog/post235.html)

In file: blog/post373.html
  - Broken image (img src): ../images/blog/post373.webp -> images/blog/post373.webp (from blog/post373.html)

In file: blog/post240.html
  - Broken image (img src): ../images/blog/post240.webp -> images/blog/post240.webp (from blog/post240.html)

In file: blog/post369.html
  - Broken image (img src): ../images/blog/post369.webp -> images/blog/post369.webp (from blog/post369.html)

In file: blog/post361.html
  - Broken image (img src): ../images/blog/post361.webp -> images/blog/post361.webp (from blog/post361.html)

In file: blog/post239.html
  - Broken image (img src): ../images/blog/post239.webp -> images/blog/post239.webp (from blog/post239.html)

In file: blog/post224.html
  - Broken image (img src): ../images/blog/post224.webp -> images/blog/post224.webp (from blog/post224.html)

In file: blog/post349.html
  - Broken image (img src): ../images/blog/post349.webp -> images/blog/post349.webp (from blog/post349.html)

In file: blog/post228.html
  - Broken image (img src): ../images/blog/post228.webp -> images/blog/post228.webp (from blog/post228.html)

In file: blog/post232.html
  - Broken image (img src): ../images/blog/post232.webp -> images/blog/post232.webp (from blog/post232.html)

In file: blog/post218.html
  - Broken image (img src): /images/blog/health-wellness-seo.webp -> /home/race/race-gemini/images/blog/health-wellness-seo.webp (from blog/post218.html)

In file: blog/post384.html
  - Broken image (img src): ../images/blog/post384.webp -> images/blog/post384.webp (from blog/post384.html)

In file: blog/post274.html
  - Broken image (img src): ../images/blog/post274.webp -> images/blog/post274.webp (from blog/post274.html)

In file: blog/post182.html
  - Broken image (img src): ../images/blog182_hero.webp -> images/blog182_hero.webp (from blog/post182.html)

In file: blog/post290.html
  - Broken image (img src): ../images/blog/post290.webp -> images/blog/post290.webp (from blog/post290.html)

In file: blog/post374.html
  - Broken image (img src): ../images/blog/post374.webp -> images/blog/post374.webp (from blog/post374.html)

In file: blog/post359.html
  - Broken image (img src): ../images/blog/post359.webp -> images/blog/post359.webp (from blog/post359.html)

In file: blog/post259.html
  - Broken image (img src): ../images/blog/post259.webp -> images/blog/post259.webp (from blog/post259.html)

In file: blog/post234.html
  - Broken image (img src): ../images/blog/post234.webp -> images/blog/post234.webp (from blog/post234.html)

In file: blog/post251.html
  - Broken image (img src): ../images/blog/post251.webp -> images/blog/post251.webp (from blog/post251.html)

In file: blog/post347.html
  - Broken image (img src): ../images/blog/post347.webp -> images/blog/post347.webp (from blog/post347.html)

In file: blog/post278.html
  - Broken image (img src): ../images/blog/post278.webp -> images/blog/post278.webp (from blog/post278.html)

In file: blog/post356.html
  - Broken image (img src): ../images/blog/post356.webp -> images/blog/post356.webp (from blog/post356.html)

In file: blog/post56.html
  - Broken image (img src): ../images/local-search-ads-2026.webp -> images/local-search-ads-2026.webp (from blog/post56.html)

In file: blog/post231.html
  - Broken image (img src): ../images/blog/post231.webp -> images/blog/post231.webp (from blog/post231.html)

In file: blog/post383.html
  - Broken image (img src): ../images/blog/post383.webp -> images/blog/post383.webp (from blog/post383.html)

In file: blog/post57.html
  - Broken image (img src): ../images/future-local-seo-2027.webp -> images/future-local-seo-2027.webp (from blog/post57.html)

In file: blog/post380.html
  - Broken image (img src): ../images/blog/post380.webp -> images/blog/post380.webp (from blog/post380.html)

In file: blog/post279.html
  - Broken image (img src): ../images/blog/post279.webp -> images/blog/post279.webp (from blog/post279.html)

In file: blog/post220.html
  - Broken image (img src): /images/blog/automotive-seo.webp -> /home/race/race-gemini/images/blog/automotive-seo.webp (from blog/post220.html)

In file: blog/post371.html
  - Broken image (img src): ../images/blog/post371.webp -> images/blog/post371.webp (from blog/post371.html)

In file: blog/post257.html
  - Broken image (img src): ../images/blog/post257.webp -> images/blog/post257.webp (from blog/post257.html)

In file: blog/post375.html
  - Broken image (img src): ../images/blog/post375.webp -> images/blog/post375.webp (from blog/post375.html)

In file: blog/post337.html
  - Broken image (img src): ../images/blog/post337.webp -> images/blog/post337.webp (from blog/post337.html)

In file: blog/post299.html
  - Broken image (img src): ../images/blog/post299.webp -> images/blog/post299.webp (from blog/post299.html)

In file: blog/post252.html
  - Broken image (img src): ../images/blog/post252.webp -> images/blog/post252.webp (from blog/post252.html)

In file: blog/post243.html
  - Broken image (img src): ../images/blog/post243.webp -> images/blog/post243.webp (from blog/post243.html)

In file: blog/post296.html
  - Broken image (img src): ../images/blog/post296.webp -> images/blog/post296.webp (from blog/post296.html)

In file: blog/post386.html
  - Broken image (img src): ../images/blog/post386.webp -> images/blog/post386.webp (from blog/post386.html)

In file: blog/post312.html
  - Broken image (img src): ../images/blog/post312.webp -> images/blog/post312.webp (from blog/post312.html)

In file: blog/post314.html
  - Broken image (img src): ../images/blog/post314.webp -> images/blog/post314.webp (from blog/post314.html)

In file: blog/post352.html
  - Broken image (img src): ../images/blog/post352.webp -> images/blog/post352.webp (from blog/post352.html)

In file: blog/post287.html
  - Broken image (img src): ../images/blog/post287.webp -> images/blog/post287.webp (from blog/post287.html)

In file: blog/post335.html
  - Broken image (img src): ../images/blog/post335.webp -> images/blog/post335.webp (from blog/post335.html)

In file: blog/post271.html
  - Broken image (img src): ../images/blog/post271.webp -> images/blog/post271.webp (from blog/post271.html)

In file: blog/post266.html
  - Broken image (img src): ../images/blog/post266.webp -> images/blog/post266.webp (from blog/post266.html)

In file: blog/post297.html
  - Broken image (img src): ../images/blog/post297.webp -> images/blog/post297.webp (from blog/post297.html)

In file: blog/post363.html
  - Broken image (img src): ../images/blog/post363.webp -> images/blog/post363.webp (from blog/post363.html)

In file: blog/post324.html
  - Broken image (img src): ../images/blog/post324.webp -> images/blog/post324.webp (from blog/post324.html)

In file: blog/post226.html
  - Broken image (img src): ../images/blog/post226.webp -> images/blog/post226.webp (from blog/post226.html)

In file: blog/post246.html
  - Broken image (img src): ../images/blog/post246.webp -> images/blog/post246.webp (from blog/post246.html)

In file: blog/post262.html
  - Broken image (img src): ../images/blog/post262.webp -> images/blog/post262.webp (from blog/post262.html)

In file: blog/post319.html
  - Broken image (img src): ../images/blog/post319.webp -> images/blog/post319.webp (from blog/post319.html)

In file: blog/post242.html
  - Broken image (img src): ../images/blog/post242.webp -> images/blog/post242.webp (from blog/post242.html)

In file: blog/post379.html
  - Broken image (img src): ../images/blog/post379.webp -> images/blog/post379.webp (from blog/post379.html)

In file: blog/post295.html
  - Broken image (img src): ../images/blog/post295.webp -> images/blog/post295.webp (from blog/post295.html)

In file: blog/post353.html
  - Broken image (img src): ../images/blog/post353.webp -> images/blog/post353.webp (from blog/post353.html)

In file: blog/post281.html
  - Broken image (img src): ../images/blog/post281.webp -> images/blog/post281.webp (from blog/post281.html)

In file: blog/post301.html
  - Broken image (img src): ../images/blog/post301.webp -> images/blog/post301.webp (from blog/post301.html)

In file: blog/post38.html
  - Broken image (img src): ../images/video-seo-2026.webp -> images/video-seo-2026.webp (from blog/post38.html)

In file: blog/post368.html
  - Broken image (img src): ../images/blog/post368.webp -> images/blog/post368.webp (from blog/post368.html)

In file: blog/post248.html
  - Broken image (img src): ../images/blog/post248.webp -> images/blog/post248.webp (from blog/post248.html)

In file: blog/post283.html
  - Broken image (img src): ../images/blog/post283.webp -> images/blog/post283.webp (from blog/post283.html)

In file: blog/post334.html
  - Broken image (img src): ../images/blog/post334.webp -> images/blog/post334.webp (from blog/post334.html)

In file: blog/post229.html
  - Broken image (img src): ../images/blog/post229.webp -> images/blog/post229.webp (from blog/post229.html)

In file: blog/post377.html
  - Broken image (img src): ../images/blog/post377.webp -> images/blog/post377.webp (from blog/post377.html)

In file: blog/post263.html
  - Broken image (img src): ../images/blog/post263.webp -> images/blog/post263.webp (from blog/post263.html)

In file: blog/post237.html
  - Broken image (img src): ../images/blog/post237.webp -> images/blog/post237.webp (from blog/post237.html)

--- END OF BROKEN LINKS ---
"""
    broken_image_paths = extract_broken_image_paths(log_output)
    print(f"Found {len(broken_image_paths)} unique broken image paths.")
    created_count = create_placeholder_images(broken_image_paths)
    print(f"Created {created_count} placeholder image files.")

if __name__ == "__main__":
    main()
