document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuContainer = document.querySelector('.mobile-menu-container');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const hamburgerIcon = document.querySelector('.mobile-menu-toggle'); // Assuming this is the hamburger icon
    let touchstartX = 0;
    let touchendX = 0;
    const swipeThreshold = 50; // Minimum distance for a swipe to be recognized

    if (mobileMenuContainer && mobileNavOverlay && hamburgerIcon) {
        mobileMenuContainer.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        });

        mobileMenuContainer.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleGesture();
        });

        // Optional: Add a simple overlay for visual feedback during swipe
        // mobileNavOverlay.addEventListener('touchmove', e => {
        //     const currentX = e.changedTouches[0].screenX;
        //     const diffX = currentX - touchstartX;
        //     if (mobileMenuContainer.classList.contains('active') && diffX > 0) {
        //         // Visually move the menu with the finger, e.g., using transform
        //         // This would require more CSS/JS coordination. For now, just handle the end gesture.
        //     }
        // });

        function handleGesture() {
            if (mobileMenuContainer.classList.contains('active')) {
                // If menu is open and swiped right (close gesture)
                if (touchendX > touchstartX + swipeThreshold) {
                    closeMobileMenu();
                }
            }
        }

        function closeMobileMenu() {
            mobileMenuContainer.classList.remove('active');
            mobileNavOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
            if (hamburgerIcon) {
                hamburgerIcon.classList.remove('open');
                hamburgerIcon.setAttribute('aria-expanded', 'false');
            }
        }
    }
});
