const cheerio = require('cheerio');

function parseAddress(html) {
    const $ = cheerio.load(html);

    // Attempt 1: Look for schema.org microdata for structured address
    const schemaAddress = $('[itemtype="http://schema.org/PostalAddress"]');
    if (schemaAddress.length) {
        const streetAddress = schemaAddress.find('[itemprop="streetAddress"]').text();
        const addressLocality = schemaAddress.find('[itemprop="addressLocality"]').text();
        const addressRegion = schemaAddress.find('[itemprop="addressRegion"]').text();
        const postalCode = schemaAddress.find('[itemprop="postalCode"]').text();
        const addressCountry = schemaAddress.find('[itemprop="addressCountry"]').text();

        const parts = [streetAddress, addressLocality, addressRegion, postalCode, addressCountry].filter(Boolean);
        if (parts.length > 0) {
            return parts.join(', ').replace(/\s+/g, ' ').trim();
        }
    }

    // Attempt 2: Fallback to general itemprop="address" text extraction
    let address = $('[itemprop="address"]').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 3: Look for h-card microformat
    address = $('.h-card').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 4: Look for vCard microformat
    address = $('.vcard').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    // Attempt 5: Look for <address> tag
    address = $('address').text();
    if (address) return address.replace(/\s+/g, ' ').trim();

    return null;
}

module.exports = { parseAddress };
