
const audits = [
    {
        name: 'location_audit',
        script: 'audit_locations.py',
        args: (url, locations) => [url, JSON.stringify(locations)],
    },
    {
        name: 'broken_links_audit',
        script: 'check_broken_links.py',
        args: (url) => [url],
    },
    {
        name: 'h1_audit',
        script: 'audit_h1_tags.py',
        args: (url) => [url],
    },
    {
        name: 'alt_attributes_audit',
        script: 'audit_alt_attributes.py',
        args: (url) => ['--url', url],
    },
    {
        name: 'h2_h3_audit',
        script: 'audit_h2_h3_tags.py',
        args: (url) => [url],
    },
    {
        name: 'readability_audit',
        script: 'audit_readability.py',
        args: (url) => [url],
    },
    {
        name: 'mobile_friendliness_audit',
        script: 'audit_mobile_friendliness.py',
        args: (url) => [url],
    },
    {
        name: 'page_load_time_audit',
        script: 'audit_page_load_times.py',
        args: (url) => [url],
    },
    {
        name: 'structured_data_audit',
        script: 'audit_structured_data.py',
        args: (url) => [url],
    },
];

module.exports = audits;
