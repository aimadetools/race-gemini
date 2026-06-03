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
