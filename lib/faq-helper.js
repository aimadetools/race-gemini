import { GoogleGenerativeAI } from '@google/generative-ai';
import { logError } from './logger.js';

function getFallbackFaqs(businessName, service, town) {
  return [
    {
      question: `How do I choose a reliable ${service} provider in ${town}?`,
      answer: `When choosing a ${service} provider in ${town}, look for a local business with qualified specialists, positive customer feedback, and upfront pricing. At ${businessName}, we ensure all our ${service} projects are handled by experienced professionals dedicated to high-quality workmanship.`
    },
    {
      question: `What is the service area for your ${service} in ${town}?`,
      answer: `We proudly serve ${town} and the surrounding neighborhoods. Our team is fully equipped to travel throughout the area to deliver prompt, professional ${service} directly to your property.`
    },
    {
      question: `How can I request a quote for ${service} in ${town}?`,
      answer: `Requesting a quote is simple and free! You can use our online request form on this page to submit your details, or call us directly. We will review your requirements and provide you with a transparent, no-obligation estimate for your ${service} needs.`
    }
  ];
}

export async function generateFaqs(businessName, service, town, enableAICopy, geminiModel) {
  let faqs = getFallbackFaqs(businessName, service, town);

  if (enableAICopy && geminiModel) {
    try {
      const prompt = `Generate 3 frequently asked questions (FAQs) and answers for a local business named "${businessName}" that provides "${service}" services in "${town}". 
Focus on helpful information for potential customers. Ensure the answers are professional, mention "${town}" and "${service}" naturally, and do not exceed 3 sentences per answer.
Format the response strictly as a JSON array of objects, where each object has "question" and "answer" keys.
Do not wrap the output in markdown block codes (like \`\`\`json). Output ONLY the raw JSON string array.`;

      const result = await geminiModel.generateContent(prompt);
      const responseText = await result.response.text();
      
      // Clean potential markdown wrappers
      let cleanedJsonText = responseText.trim();
      if (cleanedJsonText.startsWith('```')) {
        cleanedJsonText = cleanedJsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
      }

      const parsedFaqs = JSON.parse(cleanedJsonText);
      if (Array.isArray(parsedFaqs) && parsedFaqs.length >= 3) {
        faqs = parsedFaqs.slice(0, 3);
      }
    } catch (error) {
      await logError(error, `FAQ Helper - Failed to generate AI FAQs for ${service} in ${town}, falling back to defaults.`);
    }
  }

  // Generate HTML
  const accordionItemsHtml = faqs.map((faq, index) => `
      <div class="faq-item">
        <div class="faq-question">
          <span>${faq.question}</span>
        </div>
        <div class="faq-answer">
          <p>${faq.answer}</p>
        </div>
      </div>`).join('\n');

  const faqHtml = `
<!-- Frequently Asked Questions Accordion Section -->
<section class="faq-section" id="faq-section">
  <style>
    .faq-section {
      padding: 5rem 0;
      background-color: var(--bg-alt, #f9fafb);
      border-top: 1px solid var(--border-color, #e5e7eb);
      border-bottom: 1px solid var(--border-color, #e5e7eb);
    }
    .faq-section h2 {
      font-size: 2.25rem;
      font-weight: 700;
      color: #111827;
      text-align: center;
      margin-top: 0;
      margin-bottom: 3rem;
    }
    .faq-accordion {
      max-width: 800px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .faq-item {
      background: #ffffff;
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
      transition: all 0.25s ease;
    }
    .faq-item:hover {
      box-shadow: 0 6px 12px -1px rgba(0,0,0,0.04);
      border-color: var(--primary-color, #007bff);
    }
    .faq-question {
      padding: 1.25rem 1.5rem;
      font-weight: 600;
      font-size: 1.1rem;
      color: #111827;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    }
    .faq-question::after {
      content: '\\f078';
      font-family: 'Font Awesome 6 Free';
      font-weight: 900;
      font-size: 0.9rem;
      color: var(--primary-color, #007bff);
      transition: transform 0.3s ease;
    }
    .faq-item.active .faq-question::after {
      transform: rotate(180deg);
    }
    .faq-answer {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out, padding 0.3s ease-out;
      padding: 0 1.5rem;
      color: var(--text-muted, #4b5563);
      line-height: 1.6;
      font-size: 0.975rem;
    }
    .faq-item.active .faq-answer {
      max-height: 500px;
      padding: 0 1.5rem 1.5rem 1.5rem;
    }
  </style>
  <div class="container">
    <h2>Frequently Asked Questions</h2>
    <div class="faq-accordion">
      ${accordionItemsHtml.trim()}
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const faqSection = document.getElementById('faq-section');
      if (faqSection) {
        const faqItems = faqSection.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
          const question = item.querySelector('.faq-question');
          question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            faqItems.forEach(otherItem => otherItem.classList.remove('active'));
            if (!isActive) {
              item.classList.add('active');
            }
          });
        });
      }
    });
  </script>
</section>
  `.trim();

  // Generate FAQPage JSON-LD schema
  const schemaObj = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const faqSchemaScript = `
<script type="application/ld+json">
${JSON.stringify(schemaObj, null, 2)}
</script>
  `.trim();

  return {
    faqs,
    faqHtml,
    faqSchemaScript
  };
}
