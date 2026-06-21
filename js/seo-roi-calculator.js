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

        // Update PDF Preview Calculations
        const pdfTownsCount = document.getElementById('pdf-preview-towns-count');
        const pdfAnnualRev = document.getElementById('pdf-preview-annual-rev');
        const pdfVolume = document.getElementById('pdf-preview-volume');
        const pdfSuccessRate = document.getElementById('pdf-preview-success-rate');
        const pdfCtr = document.getElementById('pdf-preview-ctr');
        const pdfConvRate = document.getElementById('pdf-preview-conv-rate');
        const pdfTraffic = document.getElementById('pdf-preview-traffic');
        const pdfLeads = document.getElementById('pdf-preview-leads');
        const pdfCloseRate = document.getElementById('pdf-preview-close-rate');
        const pdfJobs = document.getElementById('pdf-preview-jobs');
        const pdfMonthlyRev = document.getElementById('pdf-preview-monthly-rev');
        const pdfInvestment = document.getElementById('pdf-preview-investment');
        const pdfNetReturn = document.getElementById('pdf-preview-net-return');
        const pdfRoi = document.getElementById('pdf-preview-roi');

        if (pdfTownsCount) pdfTownsCount.textContent = towns;
        if (pdfAnnualRev) pdfAnnualRev.textContent = formatter.format(annualRevenue);
        if (pdfVolume) pdfVolume.textContent = numFormatter.format(totalSearchVolume);
        if (pdfSuccessRate) pdfSuccessRate.textContent = (successRate * 100) + '%';
        if (pdfCtr) pdfCtr.textContent = (ctr * 100) + '%';
        if (pdfConvRate) pdfConvRate.textContent = (convRate * 100) + '%';
        if (pdfTraffic) pdfTraffic.textContent = numFormatter.format(estimatedTraffic);
        if (pdfLeads) pdfLeads.textContent = numFormatter.format(estimatedLeads);
        if (pdfCloseRate) pdfCloseRate.textContent = (closeRate * 100) + '%';
        if (pdfJobs) pdfJobs.textContent = numFormatter.format(bookedJobs);
        if (pdfMonthlyRev) pdfMonthlyRev.textContent = formatter.format(monthlyRevenue);
        if (pdfInvestment) pdfInvestment.textContent = formatter.format(packageCost);
        if (pdfNetReturn) pdfNetReturn.textContent = formatter.format(netReturn);
        if (pdfRoi) pdfRoi.textContent = roiMultiplier > 1 ? (numFormatter.format(roiMultiplier) + 'x ROI') : 'N/A';
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

    // Report Customizer Meta Updates
    function updateReportMeta() {
        const bizNameInput = document.getElementById('pdf-business-name');
        const emailInput = document.getElementById('pdf-email');
        const contactInput = document.getElementById('pdf-contact-name');
        const websiteInput = document.getElementById('pdf-website');
        const preparedInput = document.getElementById('pdf-prepared-by');
        const phoneInput = document.getElementById('pdf-phone');
        const logoInput = document.getElementById('pdf-logo-url');
        const colorInput = document.getElementById('pdf-theme-color');

        const bizName = bizNameInput ? bizNameInput.value.trim() || 'Your Business Name' : 'Your Business Name';
        const contactEmail = emailInput ? emailInput.value.trim() || 'Not Provided' : 'Not Provided';
        const contactName = contactInput ? contactInput.value.trim() : '';
        const website = websiteInput ? websiteInput.value.trim() || 'Not Provided' : 'Not Provided';
        const preparedBy = preparedInput ? preparedInput.value.trim() || 'LocalLeads' : 'LocalLeads';
        const phone = phoneInput ? phoneInput.value.trim() || 'Not Provided' : 'Not Provided';
        const logoUrl = logoInput ? logoInput.value.trim() : '';
        const themeColor = colorInput ? colorInput.value : '#007bff';

        // Date
        const dateEl = document.getElementById('pdf-preview-date');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        // Target Biz Details
        const pdfTargetBiz = document.getElementById('pdf-preview-target-biz');
        const pdfTargetUrl = document.getElementById('pdf-preview-target-url');
        const pdfTargetIndustry = document.getElementById('pdf-preview-target-industry');

        if (pdfTargetBiz) pdfTargetBiz.textContent = bizName;
        if (pdfTargetUrl) pdfTargetUrl.textContent = 'Website: ' + website;
        
        if (pdfTargetIndustry && industrySelect) {
            const selectedNiche = industrySelect.options[industrySelect.selectedIndex].text;
            pdfTargetIndustry.textContent = 'Industry: ' + selectedNiche;
        }

        // Prepared By Details
        const pdfPrepBy = document.getElementById('pdf-preview-prepared-by');
        const pdfPrepPhone = document.getElementById('pdf-preview-prepared-phone');
        const pdfPrepEmail = document.getElementById('pdf-preview-prepared-email');
        const pdfFooterName = document.getElementById('pdf-preview-footer-name');

        if (pdfPrepBy) pdfPrepBy.textContent = preparedBy;
        if (pdfPrepPhone) pdfPrepPhone.textContent = 'Phone: ' + phone;
        if (pdfPrepEmail) pdfPrepEmail.textContent = 'Email: ' + contactEmail;
        if (pdfFooterName) pdfFooterName.textContent = preparedBy;

        // Logo
        const logoImg = document.getElementById('pdf-preview-logo');
        const logoText = document.getElementById('pdf-preview-logo-text');
        if (logoImg && logoText) {
            if (logoUrl) {
                logoImg.src = logoUrl;
                logoImg.style.display = 'block';
                logoText.style.display = 'none';
            } else {
                logoImg.style.display = 'none';
                logoText.style.display = 'block';
                logoText.textContent = preparedBy;
            }
        }

        // Color updates
        const colorHex = document.getElementById('theme-color-hex');
        if (colorHex) colorHex.textContent = themeColor.toUpperCase();
        
        const headerEl = document.querySelector('.pdf-header');
        if (headerEl) {
            headerEl.style.borderColor = themeColor;
        }

        // Custom inputs preview updates
        const keywordsInput = document.getElementById('pdf-keywords');
        const notesInput = document.getElementById('pdf-custom-notes');
        const ctaTextInput = document.getElementById('pdf-cta-text');
        const ctaLinkInput = document.getElementById('pdf-cta-link');

        const keywords = keywordsInput ? keywordsInput.value.trim() : '';
        const notes = notesInput ? notesInput.value.trim() : '';
        const ctaText = ctaTextInput ? ctaTextInput.value.trim() : '';
        const ctaLink = ctaLinkInput ? ctaLinkInput.value.trim() : '';

        const pdfCustomSection = document.getElementById('pdf-preview-custom-section');
        const pdfKeywordsContainer = document.getElementById('pdf-preview-keywords-container');
        const pdfKeywords = document.getElementById('pdf-preview-keywords');
        const pdfNotesContainer = document.getElementById('pdf-preview-notes-container');
        const pdfNotes = document.getElementById('pdf-preview-notes');

        let hasCustomContent = false;
        if (pdfKeywordsContainer && pdfKeywords) {
            if (keywords) {
                pdfKeywords.textContent = keywords;
                pdfKeywordsContainer.style.display = 'block';
                hasCustomContent = true;
            } else {
                pdfKeywordsContainer.style.display = 'none';
            }
        }
        if (pdfNotesContainer && pdfNotes) {
            if (notes) {
                pdfNotes.textContent = notes;
                pdfNotesContainer.style.display = 'block';
                hasCustomContent = true;
            } else {
                pdfNotesContainer.style.display = 'none';
            }
        }
        if (pdfCustomSection) {
            pdfCustomSection.style.display = hasCustomContent ? 'block' : 'none';
        }

        const pdfCtaBanner = document.getElementById('pdf-preview-cta-banner');
        const pdfCtaAnchor = document.getElementById('pdf-preview-cta-anchor');
        if (pdfCtaBanner && pdfCtaAnchor) {
            if (ctaText) {
                pdfCtaAnchor.textContent = ctaText;
                pdfCtaBanner.style.backgroundColor = themeColor;
                if (ctaLink) {
                    if (ctaLink.startsWith('http://') || ctaLink.startsWith('https://')) {
                        pdfCtaAnchor.href = ctaLink;
                    } else if (ctaLink.match(/^\+?[0-9\s().-]+$/)) {
                        pdfCtaAnchor.href = `tel:${ctaLink.replace(/[^0-9+]/g, '')}`;
                    } else {
                        pdfCtaAnchor.href = ctaLink;
                    }
                } else {
                    pdfCtaAnchor.href = '#';
                }
                pdfCtaBanner.style.display = 'block';
            } else {
                pdfCtaBanner.style.display = 'none';
            }
        }
    }

    // Attach Customizer Event Listeners
    const pdfBizInput = document.getElementById('pdf-business-name');
    const pdfEmailInput = document.getElementById('pdf-email');
    const pdfContactInput = document.getElementById('pdf-contact-name');
    const pdfWebsiteInput = document.getElementById('pdf-website');
    const pdfPreparedInput = document.getElementById('pdf-prepared-by');
    const pdfPhoneInput = document.getElementById('pdf-phone');
    const pdfLogoInput = document.getElementById('pdf-logo-url');
    const pdfKeywordsInput = document.getElementById('pdf-keywords');
    const pdfNotesInput = document.getElementById('pdf-custom-notes');
    const pdfCtaTextInput = document.getElementById('pdf-cta-text');
    const pdfCtaLinkInput = document.getElementById('pdf-cta-link');
    const pdfColorInput = document.getElementById('pdf-theme-color');

    const customizationInputs = [
        pdfBizInput, pdfEmailInput, pdfContactInput, pdfWebsiteInput,
        pdfPreparedInput, pdfPhoneInput, pdfLogoInput,
        pdfKeywordsInput, pdfNotesInput, pdfCtaTextInput, pdfCtaLinkInput
    ];

    customizationInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', updateReportMeta);
        }
    });

    if (pdfColorInput) {
        pdfColorInput.addEventListener('input', updateReportMeta);
    }

    // Sync CTA Lead Form with PDF builder
    const leadBizInput = document.getElementById('leadBusinessName');
    const leadEmailInput = document.getElementById('leadEmail');

    if (leadBizInput && pdfBizInput) {
        leadBizInput.addEventListener('input', (e) => {
            pdfBizInput.value = e.target.value;
            updateReportMeta();
        });
        pdfBizInput.addEventListener('input', (e) => {
            leadBizInput.value = e.target.value;
        });
    }

    if (leadEmailInput && pdfEmailInput) {
        leadEmailInput.addEventListener('input', (e) => {
            pdfEmailInput.value = e.target.value;
            updateReportMeta();
        });
        pdfEmailInput.addEventListener('input', (e) => {
            leadEmailInput.value = e.target.value;
        });
    }

    // Dynamic Loader for html2pdf.js
    function loadHtml2Pdf() {
        return new Promise((resolve, reject) => {
            if (window.html2pdf) {
                resolve(window.html2pdf);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => resolve(window.html2pdf);
            script.onerror = () => reject(new Error('Failed to load html2pdf script'));
            document.head.appendChild(script);
        });
    }

    // Lead capturing helper
    async function handleLeadCapture(email, name, source) {
        try {
            const response = await fetch('/api/capture-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    name: name,
                    source: source,
                    url: window.location.href
                })
            });
            return response.ok;
        } catch (err) {
            console.error('Failed to capture lead:', err);
            return false;
        }
    }

    // PDF generation trigger
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    const btnEmailPdf = document.getElementById('btn-email-pdf');
    const pdfMessage = document.getElementById('pdf-generator-message');

    async function generatePDF() {
        const bizName = pdfBizInput ? pdfBizInput.value.trim() : '';
        const email = pdfEmailInput ? pdfEmailInput.value.trim() : '';

        if (!bizName || !email) {
            if (pdfMessage) {
                pdfMessage.textContent = 'Please fill out Prepared For (Business Name) and Lead Contact Email.';
                pdfMessage.style.color = '#ef4444';
            }
            return false;
        }

        if (pdfMessage) {
            pdfMessage.textContent = 'Preparing your branded PDF report...';
            pdfMessage.style.color = '#3b82f6';
        }

        // Capture lead
        await handleLeadCapture(email, bizName, 'roi_pdf_download');

        try {
            if (pdfMessage) pdfMessage.textContent = 'Loading PDF engine...';
            const html2pdf = await loadHtml2Pdf();
            
            if (pdfMessage) pdfMessage.textContent = 'Generating PDF file...';
            const element = document.getElementById('report-pdf-template');
            
            const opt = {
                margin:       0.5,
                filename:     `local-seo-roi-projection-${bizName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true,
                    backgroundColor: '#111827'
                },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            await html2pdf().set(opt).from(element).save();
            
            if (pdfMessage) {
                pdfMessage.textContent = 'Branded PDF report downloaded successfully!';
                pdfMessage.style.color = '#34d399';
            }
            return true;
        } catch (err) {
            console.error('PDF export error:', err);
            if (pdfMessage) {
                pdfMessage.textContent = 'Error generating PDF. Attempting browser print instead...';
                pdfMessage.style.color = '#f59e0b';
            }
            
            setTimeout(() => {
                window.print();
                if (pdfMessage) {
                    pdfMessage.textContent = 'Print dialog opened. Select "Save as PDF" to download.';
                    pdfMessage.style.color = '#34d399';
                }
            }, 1000);
            return false;
        }
    }

    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', async (e) => {
            e.preventDefault();
            btnDownloadPdf.disabled = true;
            await generatePDF();
            btnDownloadPdf.disabled = false;
        });
    }

    if (btnEmailPdf) {
        btnEmailPdf.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const bizName = pdfBizInput ? pdfBizInput.value.trim() : '';
            const email = pdfEmailInput ? pdfEmailInput.value.trim() : '';
            const preparedBy = pdfPreparedInput ? pdfPreparedInput.value.trim() || 'LocalLeads' : 'LocalLeads';

            if (!bizName || !email) {
                if (pdfMessage) {
                    pdfMessage.textContent = 'Please fill out Prepared For (Business Name) and Lead Contact Email.';
                    pdfMessage.style.color = '#ef4444';
                }
                return;
            }

            btnEmailPdf.disabled = true;
            if (pdfMessage) {
                pdfMessage.textContent = 'Opening email client and preparing PDF...';
                pdfMessage.style.color = '#3b82f6';
            }

            // Capture lead
            await handleLeadCapture(email, bizName, 'roi_pdf_email');

            // Generate/download PDF so they have the file locally
            const success = await generatePDF();

            if (success) {
                const subject = encodeURIComponent(`Local SEO ROI & Traffic Projection for ${bizName}`);
                
                const towns = townsInput ? townsInput.value : '';
                const annualRev = outAnnualRev ? outAnnualRev.textContent : '';
                const jobs = outJobs ? outJobs.textContent : '';
                const netReturn = outNetReturn ? outNetReturn.textContent : '';
                
                const body = encodeURIComponent(
                    `Hi there,\n\n` +
                    `Here is the Local SEO ROI & Traffic Projection Report for ${bizName}.\n\n` +
                    `Summary of projections:\n` +
                    `- Target Towns/Cities: ${towns}\n` +
                    `- Est. Annual Revenue Increase: ${annualRev}\n` +
                    `- Est. Booked Jobs / Month: ${jobs}\n` +
                    `- Net Annual Profit: ${netReturn}\n\n` +
                    `Please check your browser downloads for the attached branded PDF report containing detailed metrics.\n\n` +
                    `Best regards,\n` +
                    `${preparedBy}`
                );

                if (pdfMessage) {
                    pdfMessage.textContent = 'PDF generated! Opening email client to send branded PDF report...';
                    pdfMessage.style.color = '#34d399';
                }

                window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
            } else {
                if (pdfMessage) {
                    pdfMessage.textContent = 'Failed to generate PDF report template.';
                    pdfMessage.style.color = '#ef4444';
                }
            }
            
            btnEmailPdf.disabled = false;
        });
    }

    // Initialize Preset, Meta and Calculation on Load
    loadPreset('plumbing');
    updateReportMeta();
    calculate();
});
