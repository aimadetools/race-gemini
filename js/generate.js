document.addEventListener('DOMContentLoaded', () => {
    const generateForm = document.getElementById('generate-form');
    if (!generateForm) {
        return;
    }

    const enableAICopyCheckbox = document.getElementById('enableAICopy');
    const aiStyleGroup = document.getElementById('ai-style-group');
    const submitButton = generateForm.querySelector('button[type="submit"]'); // Get submit button
    const loadingIndicator = document.getElementById('loading-indicator');
    const formErrorMessageDiv = document.getElementById('form-error-message');

    // Character counters
    const servicesInput = document.getElementById('services');
    const servicesCharCount = document.getElementById('services-char-count');
    const townsInput = document.getElementById('towns');
    const townsCharCount = document.getElementById('towns-char-count');

    // Prefill town from URL query parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    const prefillTown = urlParams.get('prefill_town');
    if (prefillTown && townsInput) {
        townsInput.value = prefillTown;
    }

    // Credit display elements
    const currentCreditsSpan = document.getElementById('current-credits');
    const estimatedCreditsSpan = document.getElementById('estimated-credits');
    const creditsStatusMessageDiv = document.getElementById('credits-status-message');
    let currentCredits = 0; // Initialize current credits

    async function fetchUserCredits() {
        try {
            const response = await fetch('/api/dashboard', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                currentCredits = data.credits || 0;
                currentCreditsSpan.textContent = currentCredits;
                updateCreditEstimates(); // Update estimates after fetching credits
            } else {
                console.error('Failed to fetch user credits:', response.statusText);
                currentCreditsSpan.textContent = 'Error';
            }
        } catch (error) {
            console.error('Error fetching user credits:', error);
            currentCreditsSpan.textContent = 'Error';
        }
    }

    function updateCreditEstimates() {
        const servicesCount = servicesInput.value.split(',').filter(s => s.trim() !== '').length;
        const townsCount = townsInput.value.split(',').filter(t => t.trim() !== '').length;
        const estimatedCredits = servicesCount * townsCount;
        estimatedCreditsSpan.textContent = estimatedCredits;

        if (currentCredits === 0) {
            creditsStatusMessageDiv.innerHTML = `<span class="error-message">You have 0 credits. <a href="/buy-credits.html">Buy credits now!</a></span>`;
            submitButton.disabled = true;
        } else if (estimatedCredits > currentCredits) {
            const needed = estimatedCredits - currentCredits;
            creditsStatusMessageDiv.innerHTML = `<span class="error-message">You need ${needed} more credits. <a href="/buy-credits.html">Buy credits now!</a></span>`;
            submitButton.disabled = true;
        } else if (estimatedCredits === 0) {
            creditsStatusMessageDiv.innerHTML = '';
            submitButton.disabled = true; // Disable until some input is provided
        }
        else {
            creditsStatusMessageDiv.innerHTML = `<span class="success-message">You have enough credits.</span>`;
            submitButton.disabled = false;
        }
    }

    function updateCharCount(inputElement, countElement) {
        countElement.textContent = inputElement.value.length;
    }

    // Initial count update
    updateCharCount(servicesInput, servicesCharCount);
    updateCharCount(townsInput, townsCharCount);

    // Pre-populate fields from URL parameters if available
    const urlParams = new URLSearchParams(window.location.search);
    const businessNameParam = urlParams.get('businessName');
    const servicesParam = urlParams.get('services');
    const townsParam = urlParams.get('towns');
    const primaryColorParam = urlParams.get('primaryColor');
    const businessNameInput = document.getElementById('businessName');
    const primaryColorInput = document.getElementById('primaryColor');

    if (businessNameParam && businessNameInput) {
        businessNameInput.value = businessNameParam;
    }
    if (servicesParam && servicesInput) {
        servicesInput.value = servicesParam;
        updateCharCount(servicesInput, servicesCharCount);
    }
    if (townsParam && townsInput) {
        townsInput.value = townsParam;
        updateCharCount(townsInput, townsCharCount);
    }
    if (primaryColorParam && primaryColorInput) {
        primaryColorInput.value = primaryColorParam;
    }
    
    async function fetchBusinessProfile() {
        try {
            const response = await fetch('/api/business-profile');
            if (response.ok) {
                const data = await response.json();
                if (data && data.profile) {
                    const profile = data.profile;
                    if (profile.name && !businessNameInput.value) {
                        businessNameInput.value = profile.name;
                    }
                    if (profile.address && profile.address.postalCode && !document.getElementById('zipCode').value) {
                        document.getElementById('zipCode').value = profile.address.postalCode;
                    }
                    if (profile.phone && !document.getElementById('telephone').value) {
                        document.getElementById('telephone').value = profile.phone;
                    }
                    if (profile.hours && !document.getElementById('openingHours').value) {
                        let openingHoursStr = '';
                        if (typeof profile.hours === 'string') {
                            openingHoursStr = profile.hours;
                        } else if (Array.isArray(profile.hours)) {
                            openingHoursStr = profile.hours.join(', ');
                        }
                        document.getElementById('openingHours').value = openingHoursStr;
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching business profile for prefill:', error);
        }
    }

    fetchUserCredits(); // Fetch credits on load
    fetchBusinessProfile(); // Prefill business profile details if available

    // Event listeners for real-time credit estimation and char count
    servicesInput.addEventListener('input', () => {
        updateCharCount(servicesInput, servicesCharCount);
        updateCreditEstimates();
    });
    townsInput.addEventListener('input', () => {
        updateCharCount(townsInput, townsCharCount);
        updateCreditEstimates();
    });

    // Toggle AI Style group visibility
    enableAICopyCheckbox.addEventListener('change', function () {
        aiStyleGroup.style.display = this.checked ? 'block' : 'none';
    });

    // Helper function for validation feedback
    function showValidationError(inputElement, message) {
        inputElement.classList.add('is-invalid');
        const errorElement = document.getElementById(`${inputElement.id}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('error-message');
        }
    }

    function clearValidationError(inputElement) {
        inputElement.classList.remove('is-invalid');
        const errorElement = document.getElementById(`${inputElement.id}-error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.classList.remove('error-message');
        }
    }

    function validateField(inputElement) {
        if (inputElement.hasAttribute('required') && inputElement.value.trim() === '') {
            showValidationError(inputElement, 'This field is required.');
            return false;
        } else {
            clearValidationError(inputElement);
            return true;
        }
    }

    // Attach real-time validation to required input fields
    const requiredInputs = generateForm.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => validateField(input)); // Clear error as user types
    });

    generateForm.addEventListener('submit', async function (event) {
        event.preventDefault();
        formErrorMessageDiv.textContent = ''; // Clear general form errors

        let formIsValid = true;
        requiredInputs.forEach(input => {
            if (!validateField(input)) {
                formIsValid = false;
            }
        });

        if (!formIsValid) {
            formErrorMessageDiv.textContent = 'Please correct the errors in the form.';
            return;
        }

        // Show loading spinner and disable button
        submitButton.disabled = true;
        submitButton.innerHTML = 'Generating... <span class="spinner"></span>';
        loadingIndicator.style.display = 'block';

        const formData = new FormData(generateForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(data),
            });

            loadingIndicator.style.display = 'none';
            // Re-enable button and remove spinner
            submitButton.disabled = false;
            submitButton.innerHTML = 'Generate Pages';

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'localleads.zip';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                trackEvent('page_generation_completed', data);
                generateForm.reset(); // Clear form on successful download
                if (enableAICopyCheckbox.checked) {
                    aiStyleGroup.style.display = 'none'; // Hide AI style options if AI copy was enabled
                }
                formErrorMessageDiv.textContent = 'Pages generated and downloaded successfully!';
                formErrorMessageDiv.classList.remove('error-message');
                formErrorMessageDiv.classList.add('success-message');
            } else {
                const error = await response.json();
                formErrorMessageDiv.textContent = `Error: ${error.message}`;
                formErrorMessageDiv.classList.remove('success-message');
                formErrorMessageDiv.classList.add('error-message');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            loadingIndicator.style.display = 'none';
            // Re-enable button and remove spinner on error
            submitButton.disabled = false;
            submitButton.innerHTML = 'Generate Pages';
            formErrorMessageDiv.textContent = 'An unexpected error occurred. Please try again later.';
            formErrorMessageDiv.classList.remove('success-message');
            formErrorMessageDiv.classList.add('error-message');
        }
    });

    // Geographic Proximity Clustering Elements
    const baseCityInput = document.getElementById('base-city');
    const btnSuggestTowns = document.getElementById('btn-suggest-towns');
    const suggestedLoading = document.getElementById('suggested-towns-loading');
    const suggestedError = document.getElementById('suggested-towns-error');
    const suggestedContainer = document.getElementById('suggested-towns-container');
    const suggestedList = document.getElementById('suggested-towns-list');
    const btnAddSelectedTowns = document.getElementById('btn-add-selected-towns');

    if (btnSuggestTowns && baseCityInput) {
        btnSuggestTowns.addEventListener('click', async () => {
            const city = baseCityInput.value.trim();
            if (!city) {
                suggestedError.textContent = 'Please enter a base city first.';
                suggestedError.style.display = 'block';
                suggestedContainer.style.display = 'none';
                return;
            }

            suggestedError.style.display = 'none';
            suggestedLoading.style.display = 'flex';
            suggestedContainer.style.display = 'none';
            btnSuggestTowns.disabled = true;

            try {
                const response = await fetch(`/api/suggest-towns?city=${encodeURIComponent(city)}`);
                suggestedLoading.style.display = 'none';
                btnSuggestTowns.disabled = false;

                if (response.ok) {
                    const data = await response.json();
                    const towns = data.towns || [];
                    if (towns.length === 0) {
                        suggestedError.textContent = 'No neighboring towns found.';
                        suggestedError.style.display = 'block';
                        return;
                    }

                    suggestedList.innerHTML = towns.map(town => `
                        <label style="display: flex; align-items: center; gap: 0.35rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; color: #e2e8f0; cursor: pointer; user-select: none; margin: 0;">
                            <input type="checkbox" class="suggested-town-checkbox" value="${town}" checked style="margin: 0; width: 14px; height: 14px; cursor: pointer;" />
                            ${town}
                        </label>
                    `).join('');
                    suggestedContainer.style.display = 'block';
                } else {
                    const errData = await response.json();
                    suggestedError.textContent = errData.message || 'Failed to fetch neighboring towns.';
                    suggestedError.style.display = 'block';
                }
            } catch (err) {
                console.error('Error fetching suggested towns:', err);
                suggestedLoading.style.display = 'none';
                btnSuggestTowns.disabled = false;
                suggestedError.textContent = 'An error occurred while finding neighboring towns.';
                suggestedError.style.display = 'block';
            }
        });

        btnAddSelectedTowns.addEventListener('click', () => {
            const checkedBoxes = document.querySelectorAll('.suggested-town-checkbox:checked');
            const selectedTowns = Array.from(checkedBoxes).map(cb => cb.value);
            
            if (selectedTowns.length === 0) {
                alert('Please select at least one town to add.');
                return;
            }

            const currentTowns = townsInput.value
                .split(',')
                .map(t => t.trim())
                .filter(t => t !== '');

            const combined = [...new Set([...currentTowns, ...selectedTowns])];
            townsInput.value = combined.join(', ');

            // Trigger input events to update counters and credit estimations
            townsInput.dispatchEvent(new Event('input'));

            // Clear checkboxes and hide list
            baseCityInput.value = '';
            suggestedContainer.style.display = 'none';
        });
    }

    // Bulk CSV Importer logic
    const bulkCsvFile = document.getElementById('bulk-csv-file');
    const bulkCsvFilename = document.getElementById('bulk-csv-filename');
    const bulkCsvStatus = document.getElementById('bulk-csv-status');

    if (bulkCsvFile) {
        bulkCsvFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) {
                bulkCsvFilename.textContent = 'No file chosen';
                bulkCsvStatus.style.display = 'none';
                return;
            }

            bulkCsvFilename.textContent = file.name;
            bulkCsvStatus.style.display = 'block';
            bulkCsvStatus.style.background = 'rgba(59, 130, 246, 0.1)';
            bulkCsvStatus.style.border = '1px solid rgba(59, 130, 246, 0.2)';
            bulkCsvStatus.style.color = '#60a5fa';
            bulkCsvStatus.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 4px;"></i> Parsing CSV...';

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    
                    if (lines.length < 2) {
                        throw new Error('CSV file is empty or missing headers.');
                    }

                    // Simple CSV parser supporting quotes
                    const parseCSVLine = (line) => {
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        result.push(current.trim());
                        return result;
                    };

                    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
                    
                    const serviceHeaders = ['service', 'services'];
                    const townHeaders = ['town', 'towns', 'city', 'cities', 'location', 'locations'];

                    const serviceIdx = headers.findIndex(h => serviceHeaders.includes(h));
                    const townIdx = headers.findIndex(h => townHeaders.includes(h));

                    if (serviceIdx === -1 && townIdx === -1) {
                        throw new Error('CSV must contain at least one column for services or towns.');
                    }

                    const parsedServices = new Set();
                    const parsedTowns = new Set();

                    for (let i = 1; i < lines.length; i++) {
                        const cols = parseCSVLine(lines[i]);
                        if (serviceIdx !== -1 && cols[serviceIdx]) {
                            cols[serviceIdx].split(',').forEach(s => {
                                const clean = s.trim();
                                if (clean) parsedServices.add(clean);
                            });
                        }
                        if (townIdx !== -1 && cols[townIdx]) {
                            cols[townIdx].split(',').forEach(t => {
                                const clean = t.trim();
                                if (clean) parsedTowns.add(clean);
                            });
                        }
                    }

                    let importedServicesCount = 0;
                    let importedTownsCount = 0;

                    if (parsedServices.size > 0) {
                        const currentServices = servicesInput.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(s => s !== '');
                        const combinedServices = [...new Set([...currentServices, ...parsedServices])];
                        servicesInput.value = combinedServices.join(', ');
                        importedServicesCount = parsedServices.size;
                    }

                    if (parsedTowns.size > 0) {
                        const currentTowns = townsInput.value
                            .split(',')
                            .map(t => t.trim())
                            .filter(t => t !== '');
                        const combinedTowns = [...new Set([...currentTowns, ...parsedTowns])];
                        townsInput.value = combinedTowns.join(', ');
                        importedTownsCount = parsedTowns.size;
                    }

                    // Trigger input event to update counters and estimates
                    servicesInput.dispatchEvent(new Event('input'));
                    townsInput.dispatchEvent(new Event('input'));

                    bulkCsvStatus.style.background = 'rgba(16, 185, 129, 0.1)';
                    bulkCsvStatus.style.border = '1px solid rgba(16, 185, 129, 0.2)';
                    bulkCsvStatus.style.color = '#34d399';
                    bulkCsvStatus.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 4px;"></i> Successfully imported ${importedServicesCount} services and ${importedTownsCount} towns!`;

                } catch (err) {
                    console.error('Error parsing CSV:', err);
                    bulkCsvStatus.style.background = 'rgba(239, 68, 68, 0.1)';
                    bulkCsvStatus.style.border = '1px solid rgba(239, 68, 68, 0.2)';
                    bulkCsvStatus.style.color = '#f87171';
                    bulkCsvStatus.innerHTML = `<i class="fas fa-exclamation-triangle" style="margin-right: 4px;"></i> Error: ${err.message}`;
                }
            };
            reader.readAsText(file);
        });
    }
});
