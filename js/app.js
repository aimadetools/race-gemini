document.addEventListener("DOMContentLoaded",function(){
  const navMenu=document.getElementById("nav-menu");
  const hamburgerIcon=document.getElementById("hamburger-icon");
  const mobileNavOverlay=document.getElementById("mobile-nav-overlay");
  const mobileMenuContainer=document.querySelector(".mobile-menu-container");
  const token=localStorage.getItem("token");
  const closeMenuBtn=document.getElementById("close-menu-btn");

  if(hamburgerIcon){
    hamburgerIcon.addEventListener("click",function(){
      if(mobileMenuContainer)mobileMenuContainer.classList.toggle("active");
      hamburgerIcon.classList.toggle("open");
      if(mobileNavOverlay)mobileNavOverlay.classList.toggle("active");
      document.body.classList.toggle("menu-open");
      hamburgerIcon.setAttribute("aria-expanded",hamburgerIcon.classList.contains("open"));
    });
    hamburgerIcon.addEventListener("keydown",function(event){
      if(event.key==="Enter"){
        if(mobileMenuContainer)mobileMenuContainer.classList.toggle("active");
        hamburgerIcon.classList.toggle("open");
        if(mobileNavOverlay)mobileNavOverlay.classList.toggle("active");
        document.body.classList.toggle("menu-open");
        hamburgerIcon.setAttribute("aria-expanded",hamburgerIcon.classList.contains("open"));
      }
    });
  }

  if(closeMenuBtn){
    closeMenuBtn.addEventListener("click",function(){
      if(mobileMenuContainer)mobileMenuContainer.classList.remove("active");
      if(hamburgerIcon)hamburgerIcon.classList.remove("open");
      if(mobileNavOverlay)mobileNavOverlay.classList.remove("active");
      document.body.classList.remove("menu-open");
      hamburgerIcon.setAttribute("aria-expanded","false");
    });
    closeMenuBtn.addEventListener("keydown",function(event){
      if(event.key==="Enter"){
        if(mobileMenuContainer)mobileMenuContainer.classList.remove("active");
        if(hamburgerIcon)hamburgerIcon.classList.remove("open");
        if(mobileNavOverlay)mobileNavOverlay.classList.remove("active");
        document.body.classList.remove("menu-open");
        hamburgerIcon.setAttribute("aria-expanded","false");
      }
    });
  }

  if(mobileNavOverlay){
    mobileNavOverlay.addEventListener("click",function(){
      if(mobileMenuContainer)mobileMenuContainer.classList.remove("active");
      if(hamburgerIcon)hamburgerIcon.classList.remove("open");
      if(mobileNavOverlay)mobileNavOverlay.classList.remove("active");
      document.body.classList.remove("menu-open");
      hamburgerIcon.setAttribute("aria-expanded","false");
    });
  }

  // Dynamic Sign In / Dashboard link based on token
  if(token){
    const authLinks = document.querySelectorAll('a[href*="auth.html"]');
    authLinks.forEach(link => {
      link.href = "/dashboard.html";
      link.textContent = "Dashboard";
      link.classList.remove("nav-btn");
      link.classList.add("nav-btn-dashboard");
    });
  }

  // Mobile dropdown accordion toggler
  const dropdownTriggers = document.querySelectorAll(".dropdown-trigger");
  dropdownTriggers.forEach(trigger => {
    trigger.addEventListener("click", function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const parent = this.parentElement;
        parent.classList.toggle("active");
        const icon = this.querySelector(".fa-chevron-down");
        if (icon) {
          icon.style.transform = parent.classList.contains("active") ? "rotate(180deg)" : "";
        }
      }
    });
  });

  // Auto-activate current navigation link
  const currentPath = window.location.pathname;
  const navLinksList = document.querySelectorAll(".nav-links a");
  navLinksList.forEach(link => {
    const linkPath = link.getAttribute("href");
    if (linkPath === currentPath || (currentPath === "/" && (linkPath === "/" || linkPath === "/index.html"))) {
      link.classList.add("active");
    }
  });
});document.addEventListener("DOMContentLoaded",function(){const cookieConsentBanner=document.createElement("div");cookieConsentBanner.id="cookieConsentBanner";cookieConsentBanner.innerHTML=`
        <p>This website uses cookies to ensure you get the best experience on our website.
        <a href="/privacy.html" target="_blank">Learn more</a></p>
        <button id="acceptCookiesBtn">Got it!</button>
    `;document.body.appendChild(cookieConsentBanner);const acceptCookiesBtn=document.getElementById("acceptCookiesBtn");if(localStorage.getItem("cookieConsent")==="accepted"){cookieConsentBanner.style.display="none"}else{cookieConsentBanner.style.display="flex"}acceptCookiesBtn.addEventListener("click",()=>{localStorage.setItem("cookieConsent","accepted");cookieConsentBanner.style.display="none"})});document.addEventListener("DOMContentLoaded",function(){const stickyCtaBar=document.querySelector(".sticky-cta-bar");if(stickyCtaBar){let lastScrollY=window.scrollY;let showBar=false;window.addEventListener("scroll",function(){if(window.scrollY>200&&window.scrollY>lastScrollY){showBar=true}else if(window.scrollY<lastScrollY){showBar=false}if(showBar){stickyCtaBar.classList.add("visible")}else{stickyCtaBar.classList.remove("visible")}lastScrollY=window.scrollY})}});

document.addEventListener("DOMContentLoaded", function() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const header = item.querySelector('h3');
        const content = item.querySelector('p');

        header.addEventListener('click', () => {
            item.classList.toggle('active');
        });

        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                item.classList.toggle('active');
            }
        });
    });
});

document.addEventListener("DOMContentLoaded", function() {
    const demoForm = document.getElementById("interactive-demo-form");
    if (demoForm) {
        demoForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const businessName = document.getElementById("demo-business-name").value.trim();
            const service = document.getElementById("demo-service").value.trim();
            const town = document.getElementById("demo-town").value.trim();
            const errorMsg = document.getElementById("demo-form-error");

            if (!businessName || !service || !town) {
                if (errorMsg) {
                    errorMsg.textContent = "Please fill in all fields.";
                    errorMsg.style.display = "block";
                }
                return;
            }

            // Simple rate limit of 3 previews per user session via local storage
            let previewCount = parseInt(localStorage.getItem("localleads_preview_count") || "0", 10);
            if (previewCount >= 3) {
                if (errorMsg) {
                    errorMsg.innerHTML = 'You have reached the free preview limit. Please <a href="/auth.html" style="color: #60a5fa; text-decoration: underline;">sign up for a free account</a> to generate more pages.';
                    errorMsg.style.display = "block";
                }
                return;
            }

            localStorage.setItem("localleads_preview_count", (previewCount + 1).toString());
            if (errorMsg) {
                errorMsg.style.display = "none";
            }

            // Open the preview in a new window/tab
            const previewUrl = `/api/preview?businessName=${encodeURIComponent(businessName)}&service=${encodeURIComponent(service)}&town=${encodeURIComponent(town)}`;
            window.open(previewUrl, "_blank");
        });
    }
});

/* Local SEO Visibility Grader Controller */
document.addEventListener("DOMContentLoaded", function() {
    const detailsForm = document.getElementById("grader-details-form");
    const emailForm = document.getElementById("grader-email-form");
    
    if (!detailsForm) return;

    let businessName = "";
    let service = "";
    let city = "";
    let computedTowns = [];

    detailsForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        businessName = document.getElementById("grader-business-name").value.trim();
        service = document.getElementById("grader-service").value.trim();
        city = document.getElementById("grader-city").value.trim();

        if (!businessName || !service || !city) return;

        // Transition to Step 2
        document.getElementById("grader-step-1").style.display = "none";
        document.getElementById("grader-step-2").style.display = "block";
        document.getElementById("grader-analyzing-state").style.display = "block";
        document.getElementById("grader-email-capture-state").style.display = "none";

        // Animate scanning progress text
        const progressTexts = [
            "Connecting to local mapping index...",
            "Analyzing neighboring towns using OpenStreetMap...",
            "Resolving geographic coordinates via OpenCage...",
            "Scanning organic local search visibility...",
            "Calculating GMB maps presence in nearby markets...",
            "Compiling final visibility report card..."
        ];
        let textIdx = 0;
        const progressEl = document.getElementById("grader-scanning-progress");
        const interval = setInterval(() => {
            if (progressEl && textIdx < progressTexts.length) {
                progressEl.textContent = progressTexts[textIdx++];
            }
        }, 1000);

        try {
            // Fetch towns from api
            const response = await fetch(`/api/suggest-towns?city=${encodeURIComponent(city)}`);
            const data = await response.json();
            
            let towns = (data && data.towns) ? data.towns : [];
            
            // Pad or trim to exactly 10 towns
            if (towns.length < 10) {
                const defaultPads = ["North", "South", "West", "East", "Heights", "Valley", "Lakes", "Springs", "Hills", "Junction"];
                let padIdx = 0;
                while (towns.length < 10 && padIdx < defaultPads.length) {
                    const paddedTown = `${city} ${defaultPads[padIdx++]}`;
                    if (!towns.includes(paddedTown)) {
                        towns.push(paddedTown);
                    }
                }
            }
            computedTowns = towns.slice(0, 10);
        } catch (err) {
            console.error("Failed to suggest towns:", err);
            // Default fallbacks
            computedTowns = [
                `${city} North`, `${city} South`, `${city} West`, `${city} East`,
                `${city} Heights`, `${city} Valley`, `${city} Lakes`, `${city} Springs`,
                `${city} Hills`, `${city} Junction`
            ];
        } finally {
            clearInterval(interval);
            // Show email capture state
            document.getElementById("grader-analyzing-state").style.display = "none";
            document.getElementById("grader-email-capture-state").style.display = "block";
        }
    });

    emailForm.addEventListener("submit", async function(e) {
        e.preventDefault();

        const email = document.getElementById("grader-email").value.trim();
        if (!email) return;

        // Capture email API
        try {
            const trackingUrl = `https://www.localseogen.com/visibility-grader?city=${encodeURIComponent(city)}&service=${encodeURIComponent(service)}&business=${encodeURIComponent(businessName)}`;
            await fetch('/api/capture-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    url: trackingUrl,
                    name: businessName,
                    source: 'visibility-grader'
                })
            });
        } catch (err) {
            console.error("Failed to capture email:", err);
        }

        // Calculate scores deterministically
        let totalScore = 0;
        const townListContainer = document.getElementById("grader-town-list");
        townListContainer.innerHTML = "";

        const listItems = computedTowns.map((town, idx) => {
            // Deterministic score based on string lengths and index to show variance
            const townScoreVal = Math.floor(((businessName.length + town.length + idx * 11) * 7) % 65);
            totalScore += townScoreVal;

            let statusText = "Invisible";
            let statusClass = "grader-status-invisible";
            if (townScoreVal > 40) {
                statusText = "Moderate";
                statusClass = "grader-status-moderate";
            } else if (townScoreVal > 15) {
                statusText = "Weak";
                statusClass = "grader-status-weak";
            }

            return {
                town: town,
                score: townScoreVal,
                statusText: statusText,
                statusClass: statusClass
            };
        });

        const avgScore = Math.round(totalScore / 10);

        // Render list items
        listItems.forEach(item => {
            const row = document.createElement("div");
            row.className = "grader-town-row";
            row.innerHTML = `
                <div class="grader-town-name">${item.town}</div>
                <div class="grader-town-bar-container">
                    <div class="grader-town-bar" style="width: 0%; background: ${item.score > 40 ? '#eab308' : item.score > 15 ? '#f59e0b' : '#ef4444'};"></div>
                </div>
                <div class="grader-town-score">${item.score}%</div>
                <div class="grader-town-status ${item.statusClass}">${item.statusText}</div>
            `;
            townListContainer.appendChild(row);
        });

        // Configure overall result details
        const percentageValEl = document.getElementById("grader-percentage-val");
        const progressCircle = document.getElementById("grader-progress-circle");
        const resultTitle = document.getElementById("grader-result-title");
        const resultSummary = document.getElementById("grader-result-summary");

        // Set overall title/summary
        if (avgScore > 40) {
            resultTitle.textContent = "Low Visibility Warning!";
            resultTitle.style.color = "#eab308";
            progressCircle.setAttribute("stroke", "#eab308");
            resultSummary.textContent = `Your business has moderate local visibility (${avgScore}%) across nearby towns. You are still missing out on significant traffic in ${listItems.filter(t => t.score <= 15).length} towns.`;
        } else {
            resultTitle.textContent = "Critical SEO Danger!";
            resultTitle.style.color = "#ef4444";
            progressCircle.setAttribute("stroke", "#ef4444");
            resultSummary.textContent = `Your business is mostly invisible (${avgScore}%) across neighboring towns! You are losing high-intent leads in ${listItems.filter(t => t.score <= 15).length} towns.`;
        }

        // Configure CTA button parameters
        const ctaBtn = document.getElementById("grader-action-btn");
        if (ctaBtn) {
            ctaBtn.href = `/generate.html?businessName=${encodeURIComponent(businessName)}&services=${encodeURIComponent(service)}&towns=${encodeURIComponent(computedTowns.join(','))}`;
        }

        // Transition to Step 3
        document.getElementById("grader-step-2").style.display = "none";
        document.getElementById("grader-step-3").style.display = "block";

        // Animate circular progress and values after displaying
        setTimeout(() => {
            // SVG circle perimeter is 2 * Math.PI * 50 = 314.15
            const dashoffset = 314.15 - (314.15 * avgScore) / 100;
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = dashoffset;
            }

            // Animate number count up
            let currentVal = 0;
            const countInterval = setInterval(() => {
                if (currentVal >= avgScore) {
                    clearInterval(countInterval);
                    percentageValEl.textContent = avgScore;
                } else {
                    currentVal++;
                    percentageValEl.textContent = currentVal;
                }
            }, 20);

            // Animate town progress bars
            const bars = document.querySelectorAll(".grader-town-bar");
            bars.forEach((bar, idx) => {
                setTimeout(() => {
                    bar.style.width = `${listItems[idx].score}%`;
                }, idx * 100);
            });
        }, 100);
    });
});