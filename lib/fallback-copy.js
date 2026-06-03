export function getFallbackMarketingCopy(businessName, service, town) {
    const serviceLower = service.toLowerCase();
    
    let paragraphs = [];
    
    if (serviceLower.includes('plumb') || serviceLower.includes('drain') || serviceLower.includes('leak') || serviceLower.includes('pipe')) {
        paragraphs = [
            `Need a reliable plumber in ${town}? Look no further than ${businessName}. We specialize in providing top-tier plumbing services for residential and commercial clients across the ${town} area. From emergency leak repairs and clogged drains to water heater installations and comprehensive pipe maintenance, our licensed team is ready to resolve your plumbing issues quickly and efficiently.`,
            `At ${businessName}, we understand that plumbing emergencies can happen at the worst times. That’s why we offer fast response times and transparent pricing. Our goal is to minimize disruption to your home or business, ensuring your systems are running smoothly. We pride ourselves on our workmanship, attention to detail, and dedication to customer satisfaction in ${town}.`,
            `Don’t let a minor plumbing leak turn into a costly repair. Contact ${businessName} today to schedule a service call or request a free estimate. Experience the difference of working with ${town}'s trusted plumbing professionals.`
        ];
    } else if (serviceLower.includes('electr') || serviceLower.includes('wire') || serviceLower.includes('power') || serviceLower.includes('lighting')) {
        paragraphs = [
            `When it comes to electrical work, safety and expertise are paramount. At ${businessName}, we provide professional electrical services to homeowners and businesses throughout ${town}. Whether you need to upgrade your electrical panel, install new lighting fixtures, wire a home addition, or troubleshoot a persistent outlet problem, our certified electricians are here to help.`,
            `We are committed to delivering safe, reliable, and up-to-code electrical solutions in ${town}. Our team is fully licensed and insured, using high-quality materials and industry-standard practices to ensure your electrical systems operate safely. We offer prompt scheduling, clear upfront pricing, and clean, respectful service.`,
            `Get in touch with the local electrical experts at ${businessName} today. Call us to discuss your electrical needs or schedule a service appointment in ${town}.`
        ];
    } else if (serviceLower.includes('clean') || serviceLower.includes('maid') || serviceLower.includes('housekeep') || serviceLower.includes('wash')) {
        paragraphs = [
            `Keep your home or workspace spotless with the professional cleaning services from ${businessName}. Serving the ${town} community, we offer customizable cleaning packages to fit your schedule and budget. From deep home cleanings and regular maid services to commercial office cleanings and post-construction cleanups, our experienced team ensures a pristine, hygienic environment.`,
            `We take pride in our thorough cleaning process, utilizing safe and effective products to leave your space sparkling. The team at ${businessName} is fully vetted, trained, and insured, giving you complete peace of mind. We focus on the details—dusting, sanitizing, vacuuming, and cleaning high-touch surfaces—so you can spend your free time doing what you love.`,
            `Request a free cleaning quote from ${businessName} today and let us do the dirty work. Experience a cleaner, fresher environment in ${town}.`
        ];
    } else if (serviceLower.includes('landscap') || serviceLower.includes('lawn') || serviceLower.includes('garden') || serviceLower.includes('tree') || serviceLower.includes('yard')) {
        paragraphs = [
            `Transform your outdoor spaces into beautiful, functional landscapes with the experts at ${businessName}. We provide professional landscaping, lawn care, and yard maintenance services to properties in ${town}. From weekly lawn mowing and seasonal cleanups to custom garden design, sod installation, and hardscaping, we bring your outdoor vision to life.`,
            `Our landscaping team combines horticultural expertise with creative design to enhance the curb appeal and value of your ${town} home or business. We work closely with you to understand your aesthetic preferences and budget, delivering reliable, timely service that keeps your turf healthy and your gardens flourishing.`,
            `Ready to elevate your outdoor space? Contact ${businessName} today to request a consultation and free quote for your next landscaping project in ${town}.`
        ];
    } else if (serviceLower.includes('roof') || serviceLower.includes('shingle') || serviceLower.includes('gutter')) {
        paragraphs = [
            `Protect your most valuable investment with quality roofing services from ${businessName}. As a trusted local roofing contractor serving ${town}, we specialize in roof repairs, complete replacements, inspections, and gutter installations. Whether you're dealing with storm damage, a persistent leak, or an aging roof, we deliver durable solutions built to withstand the elements.`,
            `We use high-quality shingles and roofing materials, installed by experienced professionals who adhere to the highest standards of safety and craftsmanship. At ${businessName}, we offer honest roof assessments, clear project scopes, and competitive pricing. We stand behind our work, ensuring a leak-free roof that enhances the safety and beauty of your property in ${town}.`,
            `Schedule a professional roof inspection with ${businessName} today. Get a free, accurate estimate on your roofing needs in ${town}.`
        ];
    } else if (serviceLower.includes('paint') || serviceLower.includes('drywall') || serviceLower.includes('decorat')) {
        paragraphs = [
            `Add a fresh splash of color and style to your property with professional painting services from ${businessName}. Serving ${town}, we offer top-quality interior and exterior painting for residential and commercial properties. From single rooms to complete exterior repaints, our skilled painters deliver crisp lines, smooth finishes, and vibrant results.`,
            `We understand that quality painting starts with proper preparation. We take care to protect your furniture, floors, and landscaping, thoroughly prepping all surfaces (sanding, scraping, priming) to ensure long-lasting paint adhesion. Our team uses premium paints and finishes, ensuring a beautiful result that you'll love for years to come.`,
            `Ready to transform your walls? Contact ${businessName} today to discuss your painting project and receive a free, no-obligation estimate in ${town}.`
        ];
    } else {
        // General default marketing copy if no specific match
        paragraphs = [
            `Are you looking for professional ${service} services in ${town}? ${businessName} is your premier local choice. We are dedicated to providing high-quality, reliable, and professional ${service} tailored to the unique needs of our residential and commercial clients throughout the ${town} area.`,
            `Our experienced team at ${businessName} combines years of industry experience with a commitment to excellence. We understand the importance of prompt response times, quality craftsmanship, and clear communication. Whether your project is large or small, we approach it with the same level of care and attention to detail that our clients in ${town} have come to trust.`,
            `Contact ${businessName} today to learn more about how we can assist with your ${service} needs. Request a free estimate and experience the difference of working with ${town}'s trusted professionals.`
        ];
    }

    return paragraphs.map(p => `<p>${p}</p>`).join('\n');
}
