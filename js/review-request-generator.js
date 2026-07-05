document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const tabSMS = document.getElementById('tab-sms');
    const tabEmail = document.getElementById('tab-email');
    const smsPreviewContainer = document.getElementById('sms-preview-container');
    const emailPreviewContainer = document.getElementById('email-preview-container');
    
    const inputBizName = document.getElementById('input-biz-name');
    const inputCustName = document.getElementById('input-cust-name');
    const inputCity = document.getElementById('input-city');
    const selectIndustry = document.getElementById('select-industry');
    const inputService = document.getElementById('input-service');
    const inputLink = document.getElementById('input-link');
    const selectTone = document.getElementById('select-tone');
    const selectStep = document.getElementById('select-step');
    
    const generatorForm = document.getElementById('generator-form');
    const generateBtn = document.getElementById('generate-campaign-btn');
    const copyBtn = document.getElementById('copy-template-btn');
    
    // Preview targets
    const smsAvatarLetters = document.getElementById('sms-avatar-letters');
    const smsSenderName = document.getElementById('sms-sender-name');
    const smsPreviewText = document.getElementById('sms-preview-text');
    
    const emailSenderVal = document.getElementById('email-sender-val');
    const emailRecipientVal = document.getElementById('email-recipient-val');
    const emailSubjectVal = document.getElementById('email-subject-val');
    const emailBodyVal = document.getElementById('email-body-val');
    
    // Lock Panel elements
    const lockPanel = document.getElementById('lock-panel');
    const resultsPanel = document.getElementById('results-panel');
    const leadForm = document.getElementById('lead-form');
    const leadName = document.getElementById('lead-name');
    const leadEmail = document.getElementById('lead-email');
    
    let activeChannel = 'sms'; // 'sms' or 'email'
    let isUnlocked = false;

    // Predefined Templates
    const templates = {
        sms: {
            seo: {
                immediate: "Hi {CustName}! Thanks for choosing {BizName}! Could you leave us a review at {Link}? It really helps if you mention the specific {Service} we did and that we served you in {City}! Thanks so much!",
                followup: "Hey {CustName}, thank you again for letting us help with your {Service} in {City}! When you leave a review at {Link}, mentioning the job details helps other local homeowners find {BizName}. We appreciate it!",
                last_chance: "Hi {CustName}. Reviews are vital for {BizName} in {City}. If you have a moment, please write a brief review mentioning our {Service} work at {Link}. It helps us show up when locals search for us!"
            },
            friendly: {
                immediate: "Hey {CustName}! It's {BizName}. Thanks for having us out to help with your {Service} in {City} today! If you have 30 seconds, could you leave us a quick review? It helps other locals find us: {Link}",
                followup: "Hi {CustName}! Just checking in to make sure everything is perfect with your {Service}. If you're happy with {BizName}, could you share your experience? It means the world to our team: {Link}",
                last_chance: "Hey {CustName}, hope you're having a great week! Just a final quick favor – if you enjoyed our {Service} work, could you leave {BizName} a quick rating? Here's the link: {Link}. Thanks again!"
            },
            professional: {
                immediate: "Hello {CustName}. Thank you for choosing {BizName} for your {Service} needs in {City}. We hope you are pleased with our work. If you have a moment, please consider sharing your feedback here: {Link}",
                followup: "Hello {CustName}. We wanted to follow up and ensure your {Service} was completed to your satisfaction. Customer satisfaction is our highest priority at {BizName}. If you can, please leave us a brief review: {Link}",
                last_chance: "Hello {CustName}. This is a brief follow-up from {BizName} regarding your recent {Service} in {City}. Your feedback helps us maintain our professional standards. Please share your rating here: {Link}"
            },
            value: {
                immediate: "Hey {CustName}! Thanks for choosing {BizName} for your {Service}. We'd love to offer you $15 off your next service or a $10 referral reward for your next review! Share your feedback here: {Link}",
                followup: "Hi {CustName}! Just a reminder that we are offering a special discount for your feedback on our {Service}. Share your review of {BizName} in {City} at {Link} and reply to this message to claim your reward!",
                last_chance: "Hey {CustName}! Final chance to claim your discount reward. Leave {BizName} an honest review for your {Service} at {Link} and we'll send it right over. Thank you for your support!"
            }
        },
        email: {
            seo: {
                immediate: {
                    subject: "Review request: How was your {Service} in {City}?",
                    body: "Hi {CustName},\n\nThank you for choosing {BizName}! We are proud to serve the {City} community with high-quality {Service} solutions.\n\nIf you have a quick moment, could you leave us a review at the link below?\n\n{Link}\n\n*SEO Tip:* When writing your review, it is incredibly helpful to mention the specific service we performed (like {Service}) and that we completed it here in {City}. This helps search engines show our business when other locals are looking for {Service}!\n\nThank you so much for helping us grow!\n\nWarmly,\n\nThe {BizName} Team"
                },
                followup: {
                    subject: "Support {BizName}'s local visibility in {City}",
                    body: "Hi {CustName},\n\nThank you again for trusting {BizName} with your recent {Service}!\n\nIf you were satisfied with our work, would you consider writing us a quick review?\n\nPlease use this direct link:\n\n{Link}\n\nIf you could mention '{Service}' and '{City}' in your comment, it makes a huge difference in helping us show up on Google Maps when local residents search for our services.\n\nThank you for supporting our local business!\n\nBest,\n\nThe {BizName} Team"
                },
                last_chance: {
                    subject: "Share your {Service} experience in {City}",
                    body: "Hi {CustName},\n\nWe hope you are enjoying the results of your recent {Service}!\n\nAs a local business in {City}, our online visibility is heavily dependent on Google reviews. If you could share your feedback, it would help us greatly.\n\nPlease click here to rate us:\n\n{Link}\n\nMentioning the specific job we did (like {Service}) and your location helps us show up for other customers in need.\n\nThank you for your business and support!\n\nBest regards,\n\n{BizName}"
                }
            },
            friendly: {
                immediate: {
                    subject: "How did we do with your {Service}, {CustName}?",
                    body: "Hi {CustName},\n\nThanks so much for choosing {BizName} today! We hope you're thrilled with how the {Service} turned out.\n\nOur business runs on word of mouth, and reviews from great customers like you make all the difference in {City}.\n\nIf you have just 30 seconds, could you click the link below and share your experience?\n\n{Link}\n\nWe really appreciate your support!\n\nBest,\n\nThe {BizName} Team"
                },
                followup: {
                    subject: "Quick question about your {Service} with {BizName}",
                    body: "Hi {CustName},\n\nJust checking in to make sure everything is running smoothly after we finished up your {Service} the other day.\n\nIf you're happy with the results, would you mind taking a moment to write a quick review?\n\nHere's the direct link:\n\n{Link}\n\nThanks again for your business, and feel free to reach out if you need anything else!\n\nCheers,\n\nThe {BizName} Team"
                },
                last_chance: {
                    subject: "We'd love your feedback, {CustName}!",
                    body: "Hi {CustName},\n\nHope you're having a great week!\n\nI wanted to reach out one last time to ask if you'd be willing to share your thoughts on the {Service} we completed for you in {City}.\n\nYour feedback helps us continue to improve, and it helps other local folks find a reliable {Service} provider.\n\nYou can leave a quick rating here:\n\n{Link}\n\nThanks so much for your time and support!\n\nBest regards,\n\nThe {BizName} Team"
                }
            },
            professional: {
                immediate: {
                    subject: "Feedback request: Recent {Service} by {BizName}",
                    body: "Dear {CustName},\n\nThank you for choosing {BizName} for your recent {Service} in {City}. We appreciate your business and hope our service met your expectations.\n\nWe constantly strive to provide the highest quality service to our clients. If you have a moment, we would appreciate it if you could share your feedback by leaving a brief review:\n\n{Link}\n\nThank you for your valuable time.\n\nSincerely,\n\nCustomer Service\n{BizName}"
                },
                followup: {
                    subject: "Following up on your service satisfaction",
                    body: "Dear {CustName},\n\nThis is a brief follow-up to ensure that the {Service} completed by {BizName} met all your standards.\n\nClient satisfaction is our utmost priority, and your review would help us verify that we are continuing to deliver professional results in {City}.\n\nIf you are satisfied, please take a moment to rate us here:\n\n{Link}\n\nThank you again for your business.\n\nSincerely,\n\n{BizName} Management"
                },
                last_chance: {
                    subject: "Request for review: {Service} in {City}",
                    body: "Dear {CustName},\n\nWe are contacting you to request your feedback regarding the {Service} performed recently at your location.\n\nYour perspective helps {BizName} maintain and improve our service standards for all clients in the {City} area.\n\nIf you haven't already, please consider leaving a review using this link:\n\n{Link}\n\nThank you for your time and your support of our business.\n\nRespectfully,\n\n{BizName} Team"
                }
            },
            value: {
                immediate: {
                    subject: "Get $15 off: Tell us how we did, {CustName}!",
                    body: "Hi {CustName},\n\nThank you for choosing {BizName} for your recent {Service}!\n\nTo thank you for your support, we'd love to offer you $15 off your next service or a special referral bonus for writing a quick review.\n\nPlease click the link below to share your experience:\n\n{Link}\n\nOnce completed, simply reply to this email and we'll send over your discount code!\n\nThanks again,\n\nThe {BizName} Team"
                },
                followup: {
                    subject: "Claim your $15 discount with {BizName}",
                    body: "Hi {CustName},\n\nJust a quick reminder that you can claim a $15 discount on your next service by sharing your feedback about {BizName}.\n\nWe loved helping you with your {Service} in {City}, and your review helps us reach more clients like you.\n\nLeave your review here:\n\n{Link}\n\nReply to this email when done to receive your voucher.\n\nBest,\n\nThe {BizName} Team"
                },
                last_chance: {
                    subject: "Final chance to get your {BizName} reward",
                    body: "Hi {CustName},\n\nWe haven't received your review yet! Don't miss out on your $15 discount voucher for your next service with {BizName}.\n\nIt only takes 30 seconds to rate us for the {Service} we completed in {City}:\n\n{Link}\n\nWe appreciate your support and look forward to working with you again!\n\nBest regards,\n\nThe {BizName} Team"
                }
            }
        }
    };

    // Check if user is logged in
    let checkAuth = false;
    try {
        const response = await fetch('/api/business-profile');
        if (response.ok) {
            const data = await response.json();
            if (data && data.profile) {
                checkAuth = true;
                isUnlocked = true;
                
                // Prefill form
                const profile = data.profile;
                inputBizName.value = profile.name || "Our Business";
                if (profile.email) {
                    emailSenderVal.textContent = `hello@${profile.email.split('@')[1]}`;
                }
                
                // Fetch dynamic feedback share link if present
                const detailsRes = await fetch('/api/public-business-info?clientId=' + profile.id);
                if (detailsRes.ok) {
                    const details = await detailsRes.json();
                    if (details.googleReviewLink) {
                        inputLink.value = details.googleReviewLink;
                    }
                }
            }
        }
    } catch (err) {
        console.error("Auth prefill error:", err);
    }

    // Check localStorage fallback for guest unlock
    if (!isUnlocked && localStorage.getItem('review_generator_unlocked') === 'true') {
        isUnlocked = true;
    }

    // Update UI panels based on unlock status
    function updateUnlockUI() {
        if (isUnlocked) {
            lockPanel.style.display = 'none';
            resultsPanel.style.display = 'block';
        } else {
            lockPanel.style.display = 'block';
            resultsPanel.style.display = 'none';
        }
    }
    updateUnlockUI();

    // Tab Switching
    tabSMS.addEventListener('click', () => {
        activeChannel = 'sms';
        tabSMS.classList.add('active');
        tabEmail.classList.remove('active');
        smsPreviewContainer.style.display = 'block';
        emailPreviewContainer.style.display = 'none';
        updatePreview();
    });

    tabEmail.addEventListener('click', () => {
        activeChannel = 'email';
        tabEmail.classList.add('active');
        tabSMS.classList.remove('active');
        smsPreviewContainer.style.display = 'none';
        emailPreviewContainer.style.display = 'block';
        updatePreview();
    });

    // Handle interactive form inputs
    const inputElements = [inputBizName, inputCustName, inputCity, selectIndustry, inputService, inputLink, selectTone, selectStep];
    inputElements.forEach(el => {
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });

    // Format fields with placeholders
    function formatTemplate(templateStr) {
        let result = templateStr;
        const bizName = inputBizName.value.trim() || "Apex Plumbing";
        const custName = inputCustName.value.trim() || "John";
        const city = inputCity.value.trim() || "Austin";
        let service = inputService.value.trim();
        if (!service) {
            service = (selectIndustry.value + " services").toLowerCase();
        }
        const link = inputLink.value.trim() || "https://localseogen.com/feedback";

        result = result.replace(/{BizName}/g, bizName);
        result = result.replace(/{CustName}/g, custName);
        result = result.replace(/{City}/g, city);
        result = result.replace(/{Service}/g, service);
        result = result.replace(/{Link}/g, link);
        return result;
    }

    // Live preview update
    function updatePreview() {
        const tone = selectTone.value;
        const step = selectStep.value;
        const bizName = inputBizName.value.trim() || "Apex Plumbing";
        const custName = inputCustName.value.trim() || "John";

        // Update SMS avatar/letters
        smsSenderName.textContent = bizName;
        const initials = bizName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        smsAvatarLetters.textContent = initials || "BIZ";

        // Update Email meta
        const domain = bizName.toLowerCase().replace(/[^a-z0-9]/g, '') || "business";
        emailSenderVal.textContent = `hello@${domain}.com`;
        emailRecipientVal.textContent = `${custName.toLowerCase()}@customer.com`;

        if (activeChannel === 'sms') {
            const rawTemplate = templates.sms[tone][step];
            const formatted = formatTemplate(rawTemplate);
            smsPreviewText.textContent = formatted;
        } else {
            const rawSubject = templates.email[tone][step].subject;
            const rawBody = templates.email[tone][step].body;
            
            emailSubjectVal.textContent = formatTemplate(rawSubject);
            emailBodyVal.textContent = formatTemplate(rawBody);
        }
    }

    // Initialize first preview
    updatePreview();

    // Unlock Lead capture submit
    leadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = leadName.value.trim();
        const email = leadEmail.value.trim();
        const currentUrl = window.location.href;

        try {
            await fetch('/api/capture-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    url: currentUrl,
                    name: name,
                    source: 'review-request-generator'
                })
            });
            
            isUnlocked = true;
            localStorage.setItem('review_generator_unlocked', 'true');
            updateUnlockUI();
            updatePreview();
        } catch (err) {
            console.error("Lead capture failed:", err);
            // Fallback unlock to not block user
            isUnlocked = true;
            localStorage.setItem('review_generator_unlocked', 'true');
            updateUnlockUI();
            updatePreview();
        }
    });

    // Copy Content Button Action
    copyBtn.addEventListener('click', async () => {
        let contentToCopy = '';
        if (activeChannel === 'sms') {
            contentToCopy = smsPreviewText.textContent;
        } else {
            contentToCopy = `Subject: ${emailSubjectVal.textContent}\n\n${emailBodyVal.textContent}`;
        }

        try {
            await navigator.clipboard.writeText(contentToCopy);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.style.background = '#10b981';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy content. Please select and copy manually.');
        }
    });
});
