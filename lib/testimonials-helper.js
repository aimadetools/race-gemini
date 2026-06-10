export function renderTestimonialsSection(testimonials) {
    if (!testimonials || testimonials.length === 0) {
        return '';
    }

    let cardsHtml = '';
    testimonials.forEach((t) => {
        const ratingStars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
        const avatarSrc = t.author_avatar || 'https://www.localseogen.com/images/default-avatar.png';
        const formattedDate = t.review_date ? new Date(t.review_date).toLocaleDateString() : '';

        cardsHtml += `
        <div class="testimonial-card">
          <div class="testimonial-stars">${ratingStars}</div>
          <p class="testimonial-text">"${escapeHtml(t.review_text)}"</p>
          <div class="testimonial-author">
            <img class="testimonial-avatar" src="${avatarSrc}" alt="${escapeHtml(t.author_name)}" />
            <div class="testimonial-author-info">
              <h4 class="testimonial-author-name">${escapeHtml(t.author_name)}</h4>
              <p class="testimonial-date">${formattedDate}</p>
            </div>
          </div>
        </div>
        `;
    });

    return `
    <section class="testimonials-section">
      <div class="container">
        <h2>What Our Customers Say</h2>
        <div class="testimonials-container testimonial-carousel-container">
          <div class="testimonial-cards">
            ${cardsHtml}
          </div>
          <button class="carousel-nav prev-btn" aria-label="Previous review"><i class="fas fa-chevron-left"></i></button>
          <button class="carousel-nav next-btn" aria-label="Next review"><i class="fas fa-chevron-right"></i></button>
          <div class="carousel-dots"></div>
        </div>
      </div>
    </section>
    `;
}

export function generateSchemaReviews(testimonials) {
    if (!testimonials || testimonials.length === 0) {
        return {};
    }

    const reviewSchema = testimonials.map(t => ({
        "@type": "Review",
        "author": {
            "@type": "Person",
            "name": t.author_name
        },
        "datePublished": t.review_date ? new Date(t.review_date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        "reviewBody": t.review_text,
        "reviewRating": {
            "@type": "Rating",
            "ratingValue": t.rating.toString(),
            "bestRating": "5"
        }
    }));

    const totalRating = testimonials.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating = (totalRating / testimonials.length).toFixed(1);

    const aggregateRatingSchema = {
        "@type": "AggregateRating",
        "ratingValue": avgRating,
        "reviewCount": testimonials.length.toString(),
        "bestRating": "5"
    };

    return {
        review: reviewSchema,
        aggregateRating: aggregateRatingSchema
    };
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
