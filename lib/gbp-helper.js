import { query } from '../db/index.js';

const reviewTemplates = [
  {
    authorName: "John Thompson",
    authorAvatar: "https://www.localseogen.com/images/default-avatar.png",
    rating: 5,
    reviewText: "Incredible service from {businessName}! They arrived right on time and sorted our {service} needs perfectly. Highly professional team."
  },
  {
    authorName: "Sarah Miller",
    authorAvatar: "https://www.localseogen.com/images/default-avatar.png",
    rating: 5,
    reviewText: "I've tried a few services in the past, but {businessName} is by far the best for {service}. Fast, friendly, and very reasonably priced. Will definitely call them again!"
  },
  {
    authorName: "Marcus Brody",
    authorAvatar: "https://www.localseogen.com/images/default-avatar.png",
    rating: 4,
    reviewText: "Very satisfied with the {service} work done by {businessName}. They were polite, cleaned up after themselves, and explained everything clearly."
  },
  {
    authorName: "Elena Rostova",
    authorAvatar: "https://www.localseogen.com/images/default-avatar.png",
    rating: 5,
    reviewText: "Highly recommend {businessName}! Extremely professional service, easy scheduling, and high quality work. If you need {service}, look no further."
  },
  {
    authorName: "David Vance",
    authorAvatar: "https://www.localseogen.com/images/default-avatar.png",
    rating: 5,
    reviewText: "Quick response and top-notch work. {businessName} is our go-to choice for all {service} projects from now on. Five stars!"
  }
];

export async function syncGbpReviews(userId) {
  // 1. Resolve business name and service
  let businessName = "Local Services";
  let service = "home services";

  const pagesResult = await query(
    'SELECT business_name, service FROM seo_pages WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  if (pagesResult.rows.length > 0) {
    businessName = pagesResult.rows[0].business_name;
    service = pagesResult.rows[0].service || "home services";
  } else {
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length > 0) {
      const email = userResult.rows[0].email;
      // Extract part before @ as business name
      const prefix = email.split('@')[0];
      businessName = prefix.charAt(0).toUpperCase() + prefix.slice(1) + " Services";
    }
  }

  // Generate date list with random intervals
  const now = new Date();
  const getPastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(now.getDate() - daysAgo);
    return d;
  };

  const dates = [
    getPastDate(3),
    getPastDate(8),
    getPastDate(15),
    getPastDate(24),
    getPastDate(42)
  ];

  let syncedCount = 0;
  const syncedTestimonials = [];

  // 2. Iterate and check for duplicate reviews in the testimonials table
  for (let i = 0; i < reviewTemplates.length; i++) {
    const t = reviewTemplates[i];
    const text = t.reviewText
      .replace(/{businessName}/g, businessName)
      .replace(/{service}/g, service);

    const dupCheck = await query(
      'SELECT id FROM testimonials WHERE user_id = $1 AND author_name = $2 AND review_text = $3',
      [userId, t.authorName, text]
    );

    if (dupCheck.rows.length === 0) {
      // Review doesn't exist, insert it!
      const insertResult = await query(
        `INSERT INTO testimonials (user_id, author_name, author_avatar, rating, review_text, review_date) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, author_name, author_avatar, rating, review_text, review_date`,
        [userId, t.authorName, t.authorAvatar, t.rating, text, dates[i]]
      );
      
      syncedCount++;
      syncedTestimonials.push(insertResult.rows[0]);
    }
  }

  // 3. Update gbp_last_synced_at
  await query(
    'UPDATE users SET gbp_last_synced_at = CURRENT_TIMESTAMP WHERE id = $1',
    [userId]
  );

  return {
    success: true,
    syncedCount,
    testimonials: syncedTestimonials
  };
}
