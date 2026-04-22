// js/scroll-to-top.js
document.addEventListener("DOMContentLoaded", function() {
    const scrollToTopBtn = document.createElement("button");
    scrollToTopBtn.innerHTML = "&uarr;"; // Up arrow
    scrollToTopBtn.id = "scrollToTopBtn";
    document.body.appendChild(scrollToTopBtn);

    // Show/hide the button based on scroll position
    window.onscroll = function() {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            scrollToTopBtn.style.display = "block";
        } else {
            scrollToTopBtn.style.display = "none";
        }
    };

    // Scroll to top when button is clicked
    scrollToTopBtn.onclick = function() {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };
});
