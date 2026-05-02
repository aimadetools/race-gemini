document.addEventListener("DOMContentLoaded",function(){const navMenu=document.getElementById("nav-menu");const hamburgerIcon=document.getElementById("hamburger-icon");const mobileNavOverlay=document.getElementById("mobile-nav-overlay");const mobileMenuContainer=document.querySelector(".mobile-menu-container");const token=localStorage.getItem("token");const closeMenuBtn=document.getElementById("close-menu-btn");if(hamburgerIcon){hamburgerIcon.addEventListener("click",function(){if(mobileMenuContainer)mobileMenuContainer.classList.toggle("active");hamburgerIcon.classList.toggle("open");if(mobileNavOverlay)mobileNavOverlay.classList.toggle("active");document.body.classList.toggle("menu-open");hamburgerIcon.setAttribute("aria-expanded",hamburgerIcon.classList.contains("open"))});hamburgerIcon.addEventListener("keydown",function(event){if(event.key==="Enter"){if(mobileMenuContainer)mobileMenuContainer.classList.toggle("active");hamburgerIcon.classList.toggle("open");if(mobileNavOverlay)mobileNavOverlay.classList.toggle("active");document.body.classList.toggle("menu-open");hamburgerIcon.setAttribute("aria-expanded",hamburgerIcon.classList.contains("open"))}})}if(closeMenuBtn){closeMenuBtn.addEventListener("click",function(){if(mobileMenuContainer)mobileMenuContainer.classList.remove("active");if(hamburgerIcon)hamburgerIcon.classList.remove("open");if(mobileNavOverlay)mobileNavOverlay.classList.remove("active");document.body.classList.remove("menu-open");hamburgerIcon.setAttribute("aria-expanded","false")});closeMenuBtn.addEventListener("keydown",function(event){if(event.key==="Enter"){if(mobileMenuContainer)mobileMenuContainer.classList.remove("active");if(hamburgerIcon)hamburgerIcon.classList.remove("open");if(mobileNavOverlay)mobileNavOverlay.classList.remove("active");document.body.classList.remove("menu-open");hamburgerIcon.setAttribute("aria-expanded","false")}})}if(mobileNavOverlay){mobileNavOverlay.addEventListener("click",function(){if(mobileMenuContainer)mobileMenuContainer.classList.remove("active");if(hamburgerIcon)hamburgerIcon.classList.remove("open");if(mobileNavOverlay)mobileNavOverlay.classList.remove("active");document.body.classList.remove("menu-open");hamburgerIcon.setAttribute("aria-expanded","false")})}});document.addEventListener("DOMContentLoaded",function(){const cookieConsentBanner=document.createElement("div");cookieConsentBanner.id="cookieConsentBanner";cookieConsentBanner.innerHTML=`
        <p>This website uses cookies to ensure you get the best experience on our website.
        <a href="/privacy.html" target="_blank">Learn more</a></p>
        <button id="acceptCookiesBtn">Got it!</button>
    `;document.body.appendChild(cookieConsentBanner);const acceptCookiesBtn=document.getElementById("acceptCookiesBtn");if(localStorage.getItem("cookieConsent")==="accepted"){cookieConsentBanner.style.display="none"}else{cookieConsentBanner.style.display="flex"}acceptCookiesBtn.addEventListener("click",()=>{localStorage.setItem("cookieConsent","accepted");cookieConsentBanner.style.display="none"})});document.addEventListener("DOMContentLoaded",function(){const stickyCtaBar=document.querySelector(".sticky-cta-bar");if(stickyCtaBar){let lastScrollY=window.scrollY;let showBar=false;window.addEventListener("scroll",function(){if(window.scrollY>200&&window.scrollY>lastScrollY){showBar=true}else if(window.scrollY<lastScrollY){showBar=false}if(showBar){stickyCtaBar.classList.add("visible")}else{stickyCtaBar.classList.remove("visible")}lastScrollY=window.scrollY})}});document.addEventListener("DOMContentLoaded", function() {const scrollToTopBtnHTML = `
    <button id="scrollToTopBtn" aria-label="Scroll to top">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L12 20M12 4L18 10M12 4L6 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    </button>
`;
document.body.insertAdjacentHTML('beforeend', scrollToTopBtnHTML);const scrollToTopBtn = document.getElementById("scrollToTopBtn");if (scrollToTopBtn) {window.addEventListener("scroll", function() {if (window.scrollY > 200) {scrollToTopBtn.style.display = "block";} else {scrollToTopBtn.style.display = "none";}});scrollToTopBtn.addEventListener("click", function() {window.scrollTo({top: 0,behavior: "smooth"});});}});

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