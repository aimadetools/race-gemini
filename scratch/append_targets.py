import csv

new_targets = [
    {
        "Agency Name": "Aimclear",
        "Website": "https://aimclear.com",
        "Contact Name": "Aimclear Team",
        "Email": "contact@aimclear.com",
        "Personalization": "I saw your industry-leading integrated search marketing work in Minneapolis and thought your clients would benefit from automated local landing pages.",
        "Sent": "false"
    },
    {
        "Agency Name": "Collective Measures",
        "Website": "https://collectivemeasures.com",
        "Contact Name": "Collective Measures Team",
        "Email": "info@collectivemeasures.com",
        "Personalization": "I love your data-driven marketing approach in Minneapolis and wanted to share our organic page builder for multi-location businesses.",
        "Sent": "false"
    },
    {
        "Agency Name": "Perrill",
        "Website": "https://perrill.com",
        "Contact Name": "Perrill Team",
        "Email": "sales@perrill.com",
        "Personalization": "I saw your excellent custom web design and local SEO work in Minneapolis and thought our automated pages could complement your strategies.",
        "Sent": "false"
    },
    {
        "Agency Name": "SEO Miami",
        "Website": "https://seo-miami.com",
        "Contact Name": "SEO Miami Team",
        "Email": "info@seo-miami.com",
        "Personalization": "I came across your local search engine optimization work in Miami and loved your focus on growing organic traffic.",
        "Sent": "false"
    },
    {
        "Agency Name": "SEO Smooth",
        "Website": "https://seosmooth.com",
        "Contact Name": "SEO Smooth Team",
        "Email": "team@seosmooth.com",
        "Personalization": "I saw that you offer custom local marketing and SEO services in Miami which matches our white-label solution perfectly.",
        "Sent": "false"
    },
    {
        "Agency Name": "Local Brand Advisor",
        "Website": "https://localbrandadvisor.com",
        "Contact Name": "LBA Team",
        "Email": "sales@localbrandadvisor.com",
        "Personalization": "I saw that you specialize in local search engine marketing and multi-location SEO which is a perfect fit for our white-label platform.",
        "Sent": "false"
    },
    {
        "Agency Name": "Go Fish Digital",
        "Website": "https://gofishdigital.com",
        "Contact Name": "Go Fish Team",
        "Email": "info@gofishdigital.com",
        "Personalization": "I saw your excellent localized SEO and reputation management work in Raleigh and thought we could collaborate.",
        "Sent": "false"
    },
    {
        "Agency Name": "TheeDigital",
        "Website": "https://theedigital.com",
        "Contact Name": "TheeDigital Team",
        "Email": "info@theedigital.com",
        "Personalization": "I noticed your focus on local web design and SEO services in Raleigh and thought our automated multi-page generator could add value to your clients.",
        "Sent": "false"
    },
    {
        "Agency Name": "Dirigo Creative",
        "Website": "https://dirigocreative.com",
        "Contact Name": "Dirigo Team",
        "Email": "info@dirigocreative.com",
        "Personalization": "I came across your localized digital solutions in North Carolina and thought you would find our white-label platform interesting.",
        "Sent": "false"
    },
    {
        "Agency Name": "Digital Marketing Charlotte",
        "Website": "https://digitalclt.com",
        "Contact Name": "Digital CLT Team",
        "Email": "grow@digitalclt.com",
        "Personalization": "I saw your local marketing work for Charlotte small businesses and loved your focus on growing organic search.",
        "Sent": "false"
    },
    {
        "Agency Name": "Chavez Affiliates",
        "Website": "https://digitalmarketingagencytampa.com",
        "Contact Name": "Chavez Team",
        "Email": "chavez@digitalmarketingagencytampa.com",
        "Personalization": "I saw your excellent Local SEO work and Google Maps 3-Pack optimization focus in Tampa and thought our white-label solution would fit your workflows.",
        "Sent": "false"
    },
    {
        "Agency Name": "Digitac Media",
        "Website": "https://digitac.media",
        "Contact Name": "Digitac Team",
        "Email": "sales@digitac.media",
        "Personalization": "I noticed your boutique local SEO and web design services in Dallas and wanted to connect about expanding your local SEO page offerings.",
        "Sent": "false"
    },
    {
        "Agency Name": "Volume Nine",
        "Website": "https://v9digital.com",
        "Contact Name": "Volume Nine Team",
        "Email": "hello@v9digital.com",
        "Personalization": "I noticed your focus on SEO and marketing in Denver and loved your client-centric philosophy.",
        "Sent": "false"
    },
    {
        "Agency Name": "Digital Advengers",
        "Website": "https://digitaladvengers.com",
        "Contact Name": "Digital Advengers Team",
        "Email": "contact@digitaladvengers.com",
        "Personalization": "I saw your digital marketing and SEO growth partnerships in San Francisco and thought we could collaborate on local page generation.",
        "Sent": "false"
    },
    {
        "Agency Name": "Local Digital Marketing",
        "Website": "https://localdigitalmarketing.us",
        "Contact Name": "LDM Team",
        "Email": "info@localdigitalmarketing.us",
        "Personalization": "I saw your focus on affordable local SEO and web design for small businesses in Boston which is a perfect fit for our white-label platform.",
        "Sent": "false"
    },
    {
        "Agency Name": "Up And Social",
        "Website": "https://upandsocial.com",
        "Contact Name": "Up And Social Team",
        "Email": "info@upandsocial.com",
        "Personalization": "I admire your high-touch local SEO and web design partnership approach in Boston and wanted to share our multi-location page builder.",
        "Sent": "false"
    },
    {
        "Agency Name": "Seattle Organic SEO",
        "Website": "https://seattleorganicseo.com",
        "Contact Name": "SOS Team",
        "Email": "hello@seattleorganicseo.com",
        "Personalization": "I saw your localized organic SEO work in Seattle and thought our automated pages would align nicely with your campaign setups.",
        "Sent": "false"
    },
    {
        "Agency Name": "Michigan SEO Group",
        "Website": "https://michiganseogroup.com",
        "Contact Name": "Michigan SEO Team",
        "Email": "info@michiganseogroup.com",
        "Personalization": "I noticed your focus on localized SEO for businesses in Michigan and thought our white-label app would interest you.",
        "Sent": "false"
    },
    {
        "Agency Name": "Micronwebs",
        "Website": "https://micronwebs.com",
        "Contact Name": "Micronwebs Team",
        "Email": "info@micronwebs.com",
        "Personalization": "I saw your digital marketing and SEO services in Detroit and wanted to connect about local page generation.",
        "Sent": "false"
    },
    {
        "Agency Name": "Buckeye Internet Marketing",
        "Website": "https://buckeyeinternetmarketing.com",
        "Contact Name": "Buckeye Team",
        "Email": "contact@buckeyeinternetmarketing.com",
        "Personalization": "I saw that you specialize in local SEO and contractor marketing in Ohio which matches our white-label features perfectly.",
        "Sent": "false"
    },
    {
        "Agency Name": "Orchard Digital Marketing",
        "Website": "https://growatorchard.com",
        "Contact Name": "Orchard Team",
        "Email": "info@growatorchard.com",
        "Personalization": "I saw your local marketing and PPC campaigns in Cincinnati and wanted to share our organic page generation tool.",
        "Sent": "false"
    },
    {
        "Agency Name": "AIM Digital Agency",
        "Website": "https://aimdigitalagency.com",
        "Contact Name": "AIM Team",
        "Email": "aiminfo@aimdigitalagency.com",
        "Personalization": "I noticed your local search engine optimization services in Salt Lake City and thought our automated scaling tool could help your agency.",
        "Sent": "false"
    },
    {
        "Agency Name": "Milwaukee Marketing Partners",
        "Website": "https://mkemarketingpartners.com",
        "Contact Name": "Andrew Partners",
        "Email": "andrew@mkemarketingpartners.com",
        "Personalization": "I saw that you offer custom local web design and SEO services in Milwaukee which matches our generation capabilities.",
        "Sent": "false"
    },
    {
        "Agency Name": "Kinetic Sequence",
        "Website": "https://kineticsequence.com",
        "Contact Name": "Kinetic Team",
        "Email": "contact@kineticsequence.com",
        "Personalization": "I came across your boutique approach to SEO and brand storytelling in Wisconsin.",
        "Sent": "false"
    },
    {
        "Agency Name": "SEO Locale",
        "Website": "https://seolocale.com",
        "Contact Name": "SEO Locale Team",
        "Email": "hello@seolocale.com",
        "Personalization": "I saw your impressive track record with local SEO and web design in Philadelphia and would love to partner on local page generation.",
        "Sent": "false"
    },
    {
        "Agency Name": "Make Your Mark Digital",
        "Website": "https://makeyourmarkdigital.com",
        "Contact Name": "MYM Team",
        "Email": "Hello@MakeYourMarkDigital.com",
        "Personalization": "I admired your creative digital work and small business local marketing in Pennsylvania.",
        "Sent": "false"
    }
]

CSV_PATH = "agency-targets.csv"

def main():
    fieldnames = ["Agency Name", "Website", "Contact Name", "Email", "Personalization", "Sent"]
    
    with open(CSV_PATH, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        for t in new_targets:
            writer.writerow(t)
            
    print(f"Successfully appended {len(new_targets)} new agency targets!")

if __name__ == "__main__":
    main()
