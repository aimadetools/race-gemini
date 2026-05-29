document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#generator-form form');
    if (!form) {
        return;
    }
    const generatedOutputSection = document.getElementById('generated-pages-output');
    const generateButton = document.getElementById('generate-pages-button');
    const loadingSpinner = document.getElementById('loading-spinner');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const businessType = document.getElementById('business-type').value.trim();
        const serviceList = document.getElementById('service-list').value.trim();
        const cityList = document.getElementById('city-list').value.trim();
        const enableAICopy = document.getElementById('enable-ai-copy').checked;
        const aiStyle = document.getElementById('ai-style').value.trim();
        const template = document.getElementById('template').value;
        const primaryColor = document.getElementById('primary-color').value.trim();
        const telephone = document.getElementById('telephone').value.trim();
        const priceRange = document.getElementById('price-range').value.trim();
        const openingHours = document.getElementById('opening-hours').value.trim();

        if (!businessType || !cityList) {
            alert('Please fill in both Business Type and Cities fields.');
            return;
        }

        const telephoneRegex = /^\\+?[0-9\\s\\-\\(\\)\\_]{7,20}$/; // Added '_' to regex to allow for more flexibility
        if (telephone && !telephoneRegex.test(telephone)) {
            alert('Please enter a valid telephone number.');
            return;
        }

        const cities = cityList.split(',').map(city => city.trim()).filter(city => city.length > 0);
        const services = serviceList.split(',').map(service => service.trim()).filter(service => service.length > 0);

        if (cities.length === 0) {
            alert('Please enter at least one city.');
            return;
        }
        
        if (services.length === 0) {
             // If no specific services are provided, default to using the business type as a service
            services.push(businessType);
        }

        // Show loading state
        generateButton.disabled = true;
        loadingSpinner.style.display = 'inline-block';

        generatedOutputSection.innerHTML = '<h2>Your Generated Pages</h2><div id="generated-links"></div>'; // Clear previous output
        generatedOutputSection.style.display = 'block';

        const generatedLinksDiv = document.getElementById('generated-links');
        generatedLinksDiv.innerHTML = '<p>Generating pages... This may take a moment.</p>';

        try {
            const response = await fetch('/api/generate-seo-pages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessName: businessType,
                    services: services,
                    towns: cities,
                    enableAICopy,
                    aiStyle: aiStyle || undefined, // Send undefined if empty
                    template: template,
                    primaryColor: primaryColor || undefined, // Send undefined if empty
                    telephone: telephone || undefined,
                    priceRange: priceRange || undefined,
                    openingHours: openingHours || undefined,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                generatedLinksDiv.innerHTML = ''; // Clear "Generating pages..." message
                if (data.pages && data.pages.length > 0) {
                    const ul = document.createElement('ul');
                    data.pages.forEach(page => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = page.url; // Relative URL to the generated file
                        a.textContent = page.fileName;
                        a.target = '_blank'; // Open in new tab
                        li.appendChild(a);
                        ul.appendChild(li);
                    });
                    generatedLinksDiv.appendChild(ul);
                    alert(data.message);
                } else {
                    generatedLinksDiv.innerHTML = '<p>No pages were generated. Please check your inputs.</p>';
                }
            } else {
                generatedLinksDiv.innerHTML = `<p style="color: red;">Error: ${data.message || 'Unknown error during generation.'}</p>`;
                alert(`Error: ${data.message || 'Unknown error during generation.'}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            generatedLinksDiv.innerHTML = `<p style="color: red;">Network error or server unreachable: ${error.message}</p>`;
            alert('A network error occurred. Please check your connection or try again later.');
        } finally {
            // Hide loading state
            generateButton.disabled = false;
            loadingSpinner.style.display = 'none';
        }
        }); // End of form.addEventListener('submit', ...)

        const resetButton = document.getElementById('reset-form-button');
        resetButton.addEventListener('click', () => {
        form.reset(); // This will clear all form fields
        generatedOutputSection.style.display = 'none'; // Hide output section
        generatedOutputSection.innerHTML = ''; // Clear previous output content
        });
        });
