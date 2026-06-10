document.addEventListener('DOMContentLoaded', () => {
    // Industry presets
    const industryPresets = {
        plumbing: {
            averageValue: 250,
            volumePerTown: 180,
            ctr: 3,
            conversionRate: 8,
            closeRate: 50,
            serviceName: 'Plumbing Repair, Drain Cleaning, Water Heater Install'
        },
        electrical: {
            averageValue: 300,
            volumePerTown: 150,
            ctr: 3,
            conversionRate: 7,
            closeRate: 45,
            serviceName: 'Electrical Panel Upgrade, Outlet Repair, Wiring'
        },
        hvac: {
            averageValue: 1200,
            volumePerTown: 220,
            ctr: 3,
            conversionRate: 6,
            closeRate: 35,
            serviceName: 'AC Repair, Furnace Installation, HVAC Service'
        },
        locksmith: {
            averageValue: 150,
            volumePerTown: 130,
            ctr: 3,
            conversionRate: 12,
            closeRate: 60,
            serviceName: 'Emergency Lockout, Key Duplication, Lock Rekeying'
        },
        cleaning: {
            averageValue: 200,
            volumePerTown: 140,
            ctr: 3,
            conversionRate: 8,
            closeRate: 40,
            serviceName: 'House Cleaning, Deep Cleaning, Office Cleaning'
        },
        roofing: {
            averageValue: 3500,
            volumePerTown: 100,
            ctr: 3,
            conversionRate: 5,
            closeRate: 30,
            serviceName: 'Roof Leak Repair, Roof Replacement, Shingle Install'
        },
        landscaping: {
            averageValue: 450,
            volumePerTown: 160,
            ctr: 3,
            conversionRate: 6,
            closeRate: 40,
            serviceName: 'Lawn Care, Landscaping Design, Sod Installation'
        },
        custom: {
            averageValue: 200,
            volumePerTown: 100,
            ctr: 3,
            conversionRate: 5,
            closeRate: 40,
            serviceName: 'Local Service, Expert Service'
        }
    };

    // DOM Elements
    const industrySelect = document.getElementById('calc-industry');
    const jobValueInput = document.getElementById('calc-job-value');
    const townsInput = document.getElementById('calc-towns');
    const successRateInput = document.getElementById('calc-success-rate');
    const ctrInput = document.getElementById('calc-ctr');
    const convRateInput = document.getElementById('calc-conv-rate');
    const closeRateInput = document.getElementById('calc-close-rate');

    // Range label elements
    const townsVal = document.getElementById('calc-towns-val');
    const successRateVal = document.getElementById('calc-success-rate-val');
    const ctrVal = document.getElementById('calc-ctr-val');
    const convRateVal = document.getElementById('calc-conv-rate-val');
    const closeRateVal = document.getElementById('calc-close-rate-val');

    // Outputs
    const outTraffic = document.getElementById('out-traffic');
    const outLeads = document.getElementById('out-leads');
    const outJobs = document.getElementById('out-jobs');
    const outMonthlyRev = document.getElementById('out-monthly-rev');
    const outAnnualRev = document.getElementById('out-annual-rev');
    const outInvestment = document.getElementById('out-investment');
    const outNetReturn = document.getElementById('out-net-return');
    const outRoi = document.getElementById('out-roi');

    const recommendedPackageName = document.getElementById('recommended-package-name');
    const recommendedPackageCost = document.getElementById('recommended-package-cost');
    const recommendedPackageRoi = document.getElementById('recommended-package-roi');

    // Advanced Section Toggling
    const advancedToggle = document.getElementById('calc-advanced-toggle');
    const advancedFields = document.getElementById('calc-advanced-fields');

    if (advancedToggle && advancedFields) {
        advancedToggle.addEventListener('click', () => {
            advancedToggle.classList.toggle('active');
            advancedFields.classList.toggle('show');
        });
    }

    // Load Industry Presets
    function loadPreset(industryKey) {
        const preset = industryPresets[industryKey];
        if (!preset) return;

        jobValueInput.value = preset.averageValue;
        successRateInput.value = 40; // Default page 1 ranking success rate
        ctrInput.value = preset.ctr;
        convRateInput.value = preset.conversionRate;
        closeRateInput.value = preset.closeRate;

        // Reset range values
        successRateVal.textContent = '40%';
        ctrVal.textContent = preset.ctr + '%';
        convRateVal.textContent = preset.conversionRate + '%';
        closeRateVal.textContent = preset.closeRate + '%';

        // Prepopulate CTA lead form services
        const leadServiceInput = document.getElementById('leadService');
        if (leadServiceInput) {
            leadServiceInput.value = preset.serviceName;
        }
    }

    // Currency Formatter
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });

    const numFormatter = new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1
    });

    // ROI Calculator math
    function calculate() {
        const industry = industrySelect.value;
        const preset = industryPresets[industry] || industryPresets.custom;

        const jobValue = parseFloat(jobValueInput.value) || 0;
        const towns = parseInt(townsInput.value) || 0;
        const successRate = parseFloat(successRateInput.value) / 100;
        const ctr = parseFloat(ctrInput.value) / 100;
        const convRate = parseFloat(convRateInput.value) / 100;
        const closeRate = parseFloat(closeRateInput.value) / 100;

        // Dynamic local search volume estimate based on industry and town count
        const volumePerTown = preset.volumePerTown;
        const totalSearchVolume = towns * volumePerTown;

        // Monthly calculations
        const estimatedTraffic = totalSearchVolume * successRate * ctr;
        const estimatedLeads = estimatedTraffic * convRate;
        const bookedJobs = estimatedLeads * closeRate;
        const monthlyRevenue = bookedJobs * jobValue;
        const annualRevenue = monthlyRevenue * 12;

        // Package Suggestion & One-Time Investment Cost
        let packageCost = 49;
        let packageName = 'Starter Pack (50 Pages)';
        
        if (towns <= 50) {
            packageCost = 49;
            packageName = 'Starter Pack (50 Pages)';
        } else if (towns <= 200) {
            packageCost = 99;
            packageName = 'Pro Pack (200 Pages)';
        } else {
            packageCost = 249;
            packageName = 'Agency Pack (1,000 Pages)';
        }

        const netReturn = Math.max(0, annualRevenue - packageCost);
        const roiMultiplier = packageCost > 0 ? (annualRevenue / packageCost) : 0;

        // Update DOM
        outTraffic.textContent = numFormatter.format(estimatedTraffic);
        outLeads.textContent = numFormatter.format(estimatedLeads);
        outJobs.textContent = numFormatter.format(bookedJobs);
        outMonthlyRev.textContent = formatter.format(monthlyRevenue);
        outAnnualRev.textContent = formatter.format(annualRevenue);
        outInvestment.textContent = formatter.format(packageCost);
        outNetReturn.textContent = formatter.format(netReturn);

        if (roiMultiplier > 1) {
            outRoi.textContent = numFormatter.format(roiMultiplier) + 'x ROI';
        } else {
            outRoi.textContent = 'N/A';
        }

        if (recommendedPackageName) {
            recommendedPackageName.textContent = packageName;
        }
        if (recommendedPackageCost) {
            recommendedPackageCost.textContent = formatter.format(packageCost) + ' One-Time Fee';
        }
        if (recommendedPackageRoi) {
            if (roiMultiplier > 1) {
                recommendedPackageRoi.style.display = 'inline-block';
                recommendedPackageRoi.textContent = numFormatter.format(roiMultiplier) + 'x First-Year ROI';
            } else {
                recommendedPackageRoi.style.display = 'none';
            }
        }
    }

    // Input Listeners
    industrySelect.addEventListener('change', () => {
        loadPreset(industrySelect.value);
        calculate();
    });

    jobValueInput.addEventListener('input', calculate);

    townsInput.addEventListener('input', (e) => {
        townsVal.textContent = e.target.value;
        calculate();
    });

    successRateInput.addEventListener('input', (e) => {
        successRateVal.textContent = e.target.value + '%';
        calculate();
    });

    ctrInput.addEventListener('input', (e) => {
        ctrVal.textContent = e.target.value + '%';
        calculate();
    });

    convRateInput.addEventListener('input', (e) => {
        convRateVal.textContent = e.target.value + '%';
        calculate();
    });

    closeRateInput.addEventListener('input', (e) => {
        closeRateVal.textContent = e.target.value + '%';
        calculate();
    });

    // Lead Capture Form Submission
    const leadForm = document.getElementById('calculator-lead-form');
    const leadMessage = document.getElementById('calc-lead-message');
    const submitBtn = leadForm ? leadForm.querySelector('button[type="submit"]') : null;

    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const businessName = document.getElementById('leadBusinessName').value.trim();
            const email = document.getElementById('leadEmail').value.trim();
            const service = document.getElementById('leadService').value.trim();
            const townsCount = townsInput.value;

            if (!businessName || !email || !service) {
                leadMessage.textContent = 'Please fill out all fields.';
                leadMessage.style.color = 'red';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Sending... <span class="spinner"></span>';
            leadMessage.textContent = '';

            try {
                // Submit email to the capture endpoint
                const response = await fetch('/api/capture-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: email,
                        url: window.location.href
                    })
                });

                if (response.ok) {
                    leadMessage.textContent = 'Awesome! Redirecting you to generate your pages...';
                    leadMessage.style.color = '#34d399';
                    
                    // Track event
                    if (typeof trackEvent === 'function') {
                        trackEvent('roi_calculator_lead', {
                            businessName,
                            email,
                            service,
                            townsCount
                        });
                    }

                    // Pre-fill towns value with a placeholder list of 5 sample towns for the redirect
                    const defaultTowns = 'Springfield, Shelbyville, Capital City, Franklin, Oakwood';

                    // Redirect to generate page with pre-populated values
                    setTimeout(() => {
                        window.location.href = `/generate.html?businessName=${encodeURIComponent(businessName)}&services=${encodeURIComponent(service)}&towns=${encodeURIComponent(defaultTowns)}`;
                    }, 1500);

                } else {
                    const data = await response.json();
                    leadMessage.textContent = data.message || 'Something went wrong. Please try again.';
                    leadMessage.style.color = 'red';
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Get 5 Free Pages Now';
                }
            } catch (err) {
                console.error('Lead submission failed:', err);
                leadMessage.textContent = 'Connection error. Please try again.';
                leadMessage.style.color = 'red';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Get 5 Free Pages Now';
            }
        });
    }

    // Initialize Preset and Calculation on Load
    loadPreset('plumbing');
    calculate();
});
