# LocalLeads WordPress Integration & Widget Setup Guide

Welcome to LocalLeads! This comprehensive guide walks you through integrating LocalLeads generated landing pages and embeddable widgets (including the Google Business Profile Reviews Widget) into your WordPress site.

---

## 🚀 1. LocalLeads WordPress Plugin (Dynamic Landing Pages)

Our custom WordPress plugin allows you to host all generated "service + town" landing pages directly under your WordPress domain (e.g., `yoursite.com/local/plumbing-in-boston.html`). 

### Installation & Configuration Steps:
1. **Download:** Log in to your LocalLeads Dashboard, scroll to the **WordPress Integration** card, and click **Download WordPress Plugin**. This compiles a custom `.zip` file containing your unique Client ID.
2. **Upload & Install:** Go to your WordPress Admin Area, navigate to **Plugins** > **Add New** > **Upload Plugin**, choose the downloaded `localleads-seo.zip` file, and click **Install Now**.
3. **Activate:** Once installed, click **Activate Plugin**.
4. **Permalinks Flush (Critical):** Navigate to **Settings** > **Permalinks** in your WordPress dashboard, and simply click **Save Changes** once. This flushes WordPress's rewrite rules so the new URL patterns are recognized.
5. **Configure URL Prefix (Optional):** Go to **Settings** > **LocalLeads SEO**. The default URL prefix is `local` (e.g., `yoursite.com/local/...`). You can change this to any folder name (e.g., `locations` or `services`). *If you change this, repeat step 4.*

---

## ⭐ 2. GBP Reviews Widget Integration

The LocalLeads GBP Reviews Widget showcases your verified Google reviews dynamically on your WordPress site using standard block layouts (Carousel, Grid, or Floating Badge) matching your brand theme.

### Gutenberg (Block Editor) Integration:
1. Navigate to the **Embeddable Widgets & Badges** card on your LocalLeads Dashboard.
2. Set **Widget Type** to **GBP Reviews Widget**.
3. Customize your layout (Carousel, Grid, or Floating Badge), theme (Glassmorphic, Light, or Dark), and brand color.
4. Click **Copy Code** to copy the script snippet.
5. Open your WordPress page or post editor.
6. Click the **+** icon, search for the **Custom HTML** block, and add it.
7. Paste the copied script into the block and click **Update/Publish**.

### Site-wide Floating Badge Integration (Footer / Header):
If you chose the **Floating Badge** layout, you likely want it to display on every page of your site.
1. Copy the Reviews Widget embed code with the Floating Badge layout selected.
2. Install a header/footer injection plugin like **WPCode (Insert Headers and Footers)**.
3. In your WordPress sidebar, go to **Code Snippets** > **Header & Footer**.
4. Paste the copied snippet into the **Footer** text area (loading scripts in the footer prevents render-blocking and keeps page speeds fast).
5. Click **Save Changes**.

### Elementor, Divi, & Beaver Builder Integration:
1. Open the page layout editor in your builder (e.g., Click **Edit with Elementor**).
2. Search the widgets panel for the **HTML** block or **Code** module and drag it into your column.
3. Paste the copied script snippet into the HTML/Code properties box.
4. Apply and publish changes.

---

## 📍 3. Service Area Listing Widget

The Service Area Widget displays a clean list or card grid of all your generated local landing pages, improving internal linking authority.

### Integration Steps:
1. Select **Service Area Listing Widget** as the **Widget Type** on the dashboard.
2. Choose your layout (**Modern Card Grid** or **Pill/List Layout**).
3. Copy the script snippet.
4. Add a **Custom HTML** block inside your WordPress page editor (e.g., in a dedicated "Locations we serve" page or home page section).
5. Paste and save the code.

---

## 🔍 4. White-Label SEO Audit Widget

Let visitors run a free local SEO audit directly on your website to capture high-quality leads.

### Integration Steps:
1. Select **White-Label SEO Audit Widget** as the **Widget Type**.
2. Copy the generated `<iframe>` embed snippet.
3. In WordPress, create a new page called "Free SEO Audit" (e.g., `yoursite.com/free-seo-audit/`).
4. In the Gutenberg editor, add a **Custom HTML** block.
5. Paste the copied `<iframe>` tag into the block.
6. Publish the page. The widget will render a complete, interactive audit form.

---

## 📇 5. Structured Schema & Contact Card Widget

This widget displays a premium business contact card and automatically injects valid `LocalBusiness` JSON-LD schema into your WordPress page head for better search snippet indexing.

### Integration Steps:
1. Select **Structured Schema & Contact Card Widget** as the **Widget Type**.
2. Copy the script snippet.
3. Place a **Custom HTML** block on your **Contact Us** or **About Us** page.
4. Paste the script snippet. The contact card will display visually, and the JSON-LD structured data will be injected into the document header.

---

## 🛠️ Troubleshooting & Caching Tips

- **Widget Not Loading:** Ensure you have generated local pages first. If no pages or reviews exist, the script returns a fallback/mock status.
- **Caching Plugins (WP Rocket, LiteSpeed, W3 Total Cache):** If you update your widget styles in LocalLeads, you may need to clear your WordPress site cache to fetch the new CSS configurations.
- **Minification Conflicts:** If using Javascript minification/deferral plugins, exclude the LocalLeads script URL (`*localseogen.com/api/widget*`) from deferral to ensure immediate loading.
