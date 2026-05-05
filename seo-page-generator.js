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
            const pageTitle = `${businessType} Services in ${city}`;
            const pageContent = `<p>Looking for reliable ${businessType} services in ${city}? You've come to the right place! Our expert team offers top-notch ${businessType} solutions tailored to your needs in the ${city} area.</p>`;

            const generatedPageDiv = document.createElement('div');
            generatedPageDiv.classList.add('generated-page-preview');
            generatedPageDiv.innerHTML = `
                <h3>${pageTitle}</h3>
                <p><strong>Example Content:</strong></p>
                <div style="border: 1px solid #ccc; padding: 10px; margin-top: 5px; background: #f9f9f9;">
                    ${pageContent}
                </div>
                <p><em>(More sophisticated content generation would happen here, potentially via an API call)</em></p>
                <hr>
            `;
            generatedOutputSection.appendChild(generatedPageDiv);
        });

        alert('Pages generated successfully! (This is a basic example. Real generation would involve more complex logic and potentially server-side processing.)');
    });
});
