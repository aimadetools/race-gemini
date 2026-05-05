document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#generator-form form');
    const generatedOutputSection = document.getElementById('generated-pages-output');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const businessType = document.getElementById('business-type').value.trim();
        const cityList = document.getElementById('city-list').value.trim();
        const enableAICopy = document.getElementById('enable-ai-copy').checked;
        const aiStyle = document.getElementById('ai-style').value.trim();

        if (!businessType || !cityList) {
            alert('Please fill in both Business Type and Cities fields.');
            return;
        }

        const cities = cityList.split(',').map(city => city.trim()).filter(city => city.length > 0);

        if (cities.length === 0) {
            alert('Please enter at least one city.');
            return;
        }

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
                    businessName: businessType, // Using businessType as businessName
                    services: [businessType], // Sending businessType as a single service for now
                    towns: cities,
                    enableAICopy,
                    aiStyle: aiStyle || undefined, // Send undefined if empty
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
        }
    });
});

