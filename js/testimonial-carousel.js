document.addEventListener('DOMContentLoaded', () => {
    const carouselContainer = document.querySelector('.testimonial-carousel-container');
    if (!carouselContainer) return;

    const testimonialCards = carouselContainer.querySelector('.testimonial-cards');
    const cards = Array.from(testimonialCards.querySelectorAll('.card'));
    const prevBtn = carouselContainer.querySelector('.prev-btn');
    const nextBtn = carouselContainer.querySelector('.next-btn');
    const dotsContainer = carouselContainer.querySelector('.carousel-dots');

    let currentIndex = 0;
    const totalCards = cards.length;

    // Create dots
    for (let i = 0; i < totalCards; i++) {
        const dot = document.createElement('span');
        dot.classList.add('dot');
        dot.addEventListener('click', () => {
            moveToSlide(i);
        });
        dotsContainer.appendChild(dot);
    }
    const dots = Array.from(dotsContainer.querySelectorAll('.dot'));

    function updateCarousel() {
        // Hide all cards
        cards.forEach((card, index) => {
            card.style.display = 'none';
            if (index === currentIndex) {
                card.style.display = 'block'; // Show current card
            }
        });

        // Update active dot
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
    }

    function moveToSlide(index) {
        currentIndex = index;
        updateCarousel();
    }

    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex > 0) ? currentIndex - 1 : totalCards - 1;
        updateCarousel();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
        updateCarousel();
    });

    // Initial display
    updateCarousel();

    // Optional: Auto-play
    // setInterval(() => {
    //     currentIndex = (currentIndex < totalCards - 1) ? currentIndex + 1 : 0;
    //     updateCarousel();
    // }, 5000); // Change slide every 5 seconds
});
