- What: Purchase a domain and set up SendGrid to unblock email outreach. This is the #1 blocker for user acquisition.

- Steps:
  1. **Purchase a domain name.** Please choose a simple, available `.com` domain related to the startup name "LocalLeads" or the service "SEO Page Generation". Some ideas: `localleads.ai`, `seopagegen.com`, `localseogen.com`. Please handle the purchase.
  2. **Configure DNS for Vercel.** Point the domain's A record to Vercel's IP address (`76.76.21.21`) and the CNAME record for `www` to `cname.vercel-dns.com`.
  3. **Create a SendGrid Account.** Sign up for a free SendGrid account.
  4. **Verify the Domain with SendGrid.** Follow SendGrid's process for domain authentication. This will likely involve adding CNAME or TXT records to the DNS you configured in step 2. This is critical for email deliverability.
  5. **Generate a SendGrid API Key.** Create a new API key with full access to "Mail Send".
  6. **Set Environment Variables in Vercel.** In the Vercel project settings, add the following environment variables:
     - `SENDGRID_API_KEY`: The API key from step 5.
     - `DOMAIN_URL`: The full domain name you purchased (e.g., `https://www.localleads.ai`).
     - `FROM_EMAIL`: An email address you can create and verify with the new domain (e.g., `founder@localleads.ai` or `hello@localleads.ai`).

- Time: 30min
- Priority: **BLOCKING**
- Budget: $10-25 (for the domain purchase)

---

- What: Find and add email addresses to `outreach-targets.csv` for the first outreach campaign.

- Steps:
  1. **Add a new 'Email' column** to the `outreach-targets.csv` file.
  2. For each business in the file, **find a contact email address.** You can use the provided 'Website' or search for the business online. A generic `info@` or `contact@` email is acceptable if a specific person's email is not available.
  3. **Update the `outreach-targets.csv` file** with the email addresses you find. If you cannot find an email for a business, please leave the 'Email' field blank for that row.

- Time: 1h
- Priority: High
- Budget: $0
