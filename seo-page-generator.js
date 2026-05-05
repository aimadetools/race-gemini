// JavaScript for the Niche-Specific Local SEO Page Generator
// This file will handle form submission and page generation logic.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#generator-form form');
    const generatedOutputSection = document.getElementById('generated-pages-output');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent default form submission

        const businessType = document.getElementById('business-type').value.trim();
        const cityList = document.getElementById('city-list').value.trim();

        if (!businessType || !cityList) {
            alert('Please fill in both fields.');
            return;
        }

        const cities = cityList.split(',').map(city => city.trim()).filter(city => city.length > 0);

        if (cities.length === 0) {
            alert('Please enter at least one city.');
            return;
        }

        generatedOutputSection.innerHTML = '<h2>Your Generated Pages</h2>';
        generatedOutputSection.style.display = 'block';

        cities.forEach(city => {
            const metaTitle = `${businessType} Services in ${city} | Your Company Name`;
            const metaDescription = `Get expert ${businessType} services in ${city}. We provide high-quality solutions for all your ${businessType} needs in the ${city} area. Contact us today!`;
            const h1Content = `Expert ${businessType} Services in ${city}`;
            const bodyParagraph1 = `Looking for reliable ${businessType} services in ${city}? You've come to the right place! Our expert team offers top-notch ${businessType} solutions tailored to your needs in the ${city} area. We specialize in [Specific Service 1], [Specific Service 2], and [Specific Service 3], ensuring your complete satisfaction.`;
            const bodyParagraph2 = `Why choose us for your ${businessType} needs in ${city}? We are committed to delivering exceptional service, using only the highest quality materials, and providing transparent pricing. Our certified professionals are ready to assist you.`;

            const generatedPageDiv = document.createElement('div');
            generatedPageDiv.classList.add('generated-page-preview');
            generatedPageDiv.innerHTML = `
                <h4>Simulated Page for ${city}</h4>
                <div class="page-meta-preview" style="border: 1px solid #ddd; background: #eef; padding: 10px; margin-bottom: 10px;">
                    <p style="color: purple; margin: 0; font-size: 0.9em;">${metaTitle}</p>
                    <p style="color: green; margin: 0; font-size: 0.8em;">https://yourcompany.com/${businessType.toLowerCase().replace(/\s/g, '-')}-${city.toLowerCase().replace(/\s/g, '-')}</p>
                    <p style="color: #555; margin: 0; font-size: 0.8em;">${metaDescription}</p>
                </div>
                <div class="page-body-preview" style="border: 1px solid #ccc; padding: 15px; margin-top: 5px; background: #f9f9f9;">
                    <h1>${h1Content}</h1>
                    <p>${bodyParagraph1}</p>
                    <p>${bodyParagraph2}</p>
                    <p><em>(This is a generated content preview. The actual page would have more detailed, unique content and calls to action.)</em></p>
                </div>
                <hr style="margin: 20px 0;">
            `;
            generatedOutputSection.appendChild(generatedPageDiv);
        });

        alert('Page previews generated successfully! This is an enhanced example. Real generation would involve more complex logic, potentially an AI content API, and server-side processing for final HTML files.');
    });
});
