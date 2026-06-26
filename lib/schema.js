/**
 * Maps a service type to a specific Schema.org LocalBusiness subtype.
 * Useful for boosting local SEO indexing.
 * 
 * @param {string} service - The service type (e.g., "Plumbing", "HVAC")
 * @returns {string} The Schema.org LocalBusiness subtype (e.g., "Plumber", "HVACBusiness")
 */
export function getSchemaType(service) {
    if (!service) return 'LocalBusiness';
    const s = service.toLowerCase();
    if (s.includes('plumbing') || s.includes('plumber')) return 'Plumber';
    if (s.includes('hvac') || s.includes('heating') || s.includes('air conditioning') || s.includes('ac ')) return 'HVACBusiness';
    if (s.includes('electrician') || s.includes('electrical')) return 'Electrician';
    if (s.includes('landscaping') || s.includes('lawn') || s.includes('garden') || s.includes('tree')) return 'LandscapingService';
    if (s.includes('cleaning') || s.includes('housekeeping') || s.includes('maid') || s.includes('janitorial')) return 'HousekeepingService';
    if (s.includes('roofing') || s.includes('roofer')) return 'RoofingContractor';
    if (s.includes('paint')) return 'HousePainter';
    if (s.includes('pest')) return 'PestControlService';
    if (s.includes('locksmith')) return 'Locksmith';
    if (s.includes('moving') || s.includes('mover')) return 'MovingCompany';
    if (s.includes('automotive') || s.includes('auto repair') || s.includes('car repair')) return 'AutoRepair';
    if (s.includes('construction') || s.includes('renovation') || s.includes('remodeling') || s.includes('contractor')) return 'GeneralContractor';
    return 'LocalBusiness';
}

/**
 * Generates an OfferCatalog Schema object containing nested Service details.
 * 
 * @param {string} businessName - The name of the business
 * @param {string} service - The service category (e.g. "Plumbing", "HVAC")
 * @param {string} town - The city/town location
 * @returns {object} The OfferCatalog schema object
 */
export function generateOfferCatalog(businessName, service, town) {
    const s = service ? service.trim() : '';
    const location = town ? town.trim() : '';
    
    return {
        "@type": "OfferCatalog",
        "name": `${s} Services`,
        "itemListElement": [
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": `Residential ${s}`,
                    "description": `Professional residential ${s} installation, maintenance, and repair services in ${location}.`
                }
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": `Commercial ${s}`,
                    "description": `Reliable commercial ${s} systems setup, inspections, and customized solutions for businesses in ${location}.`
                }
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": `Emergency ${s} Service`,
                    "description": `Fast-response emergency ${s} troubleshooting and repairs available in the ${location} region.`
                }
            },
            {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": `${s} Inspection & Diagnostics`,
                    "description": `Thorough inspection, diagnostics, and preventative care for all ${s} setups in ${location}.`
                }
            }
        ]
    };
}

