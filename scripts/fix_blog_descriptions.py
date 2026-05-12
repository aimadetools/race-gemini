import os
from bs4 import BeautifulSoup

def fix_blog_descriptions(blog_index_path="blog.html", blog_posts_dir="blog"):
    """
    Populates missing blog post descriptions in blog_index_path (e.g., blog.html)
    by extracting them from the individual blog post files in blog_posts_dir.

    Args:
        blog_index_path (str): The path to the main blog index file (e.g., "blog.html").
        blog_posts_dir (str): The directory containing individual blog post HTML files.
    """
    print(f"Reading blog index file: {blog_index_path}")
    try:
        with open(blog_index_path, 'r', encoding='utf-8') as f:
            blog_index_content = f.read()
    except FileNotFoundError:
        print(f"Error: Blog index file not found at {blog_index_path}")
        return
    except Exception as e:
        print(f"Error reading {blog_index_path}: {e}")
        return

    soup = BeautifulSoup(blog_index_content, 'html.parser')
    updated = False

    for article in soup.find_all('article', class_='blog-preview'):
        p_tag = article.find('p')
        if p_tag and p_tag.get_text(strip=True) == "No description available.":
            link_tag = article.find('h2').find('a', href=True)
            if link_tag:
                post_relative_path = link_tag['href']
                # Construct absolute path to the blog post file
                post_filename = os.path.basename(post_relative_path)
                post_full_path = os.path.join(blog_posts_dir, post_filename)

                print(f"Found missing description for {post_filename}. Attempting to extract from {post_full_path}")

                try:
                    with open(post_full_path, 'r', encoding='utf-8') as f_post:
                        post_content = f_post.read()
                    post_soup = BeautifulSoup(post_content, 'html.parser')
                    meta_description_tag = post_soup.find('meta', attrs={'name': 'description'})
                    
                    if meta_description_tag and meta_description_tag.get('content'):
                        description = meta_description_tag['content'].strip()
                        p_tag.string = description
                        print(f"Updated description for {post_filename}: {description[:70]}...")
                        updated = True
                    else:
                        print(f"Warning: No meta description found in {post_full_path}. Cannot update.")
                except FileNotFoundError:
                    print(f"Error: Blog post file not found at {post_full_path}")
                except Exception as e:
                    print(f"Error reading or parsing {post_full_path}: {e}")
    
    if updated:
        print(f"Writing updated content back to {blog_index_path}")
        try:
            with open(blog_index_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            print("Blog descriptions updated successfully.")
        except Exception as e:
            print(f"Error writing to {blog_index_path}: {e}")
    else:
        print("No missing blog descriptions found or updated.")

if __name__ == "__main__":
    fix_blog_descriptions()
