import glob

def replace_logo():
    files = glob.glob("**/*.html", recursive=True)
    old_logo_1 = """<a class="logo" href="/">
      LocalLeads
     </a>"""
    old_logo_2 = '<a class="logo" href="/">LocalLeads</a>'
    old_logo_3 = """<a class="logo" href="/">
   LocalLeads
  </a>"""
    new_logo = '<a class="logo" href="/"><div class="pin"></div><span>LocalLeads</span></a>'

    for file_path in files:
        if file_path == "logo.html":
            continue
        with open(file_path, "r") as f:
            content = f.read()
        
        content = content.replace(old_logo_1, new_logo)
        content = content.replace(old_logo_2, new_logo)
        content = content.replace(old_logo_3, new_logo)

        with open(file_path, "w") as f:
            f.write(content)

if __name__ == "__main__":
    replace_logo()
