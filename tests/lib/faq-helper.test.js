import { jest } from '@jest/globals';
import { generateFaqs } from '../../lib/faq-helper.js';

describe('FAQ Helper', () => {
  const businessName = 'Austin Plumbing Experts';
  const service = 'Plumbing';
  const town = 'Austin';

  describe('Fallback FAQs', () => {
    it('should return fallback FAQs when enableAICopy is false', async () => {
      const result = await generateFaqs(businessName, service, town, false, null);
      
      expect(result.faqs).toHaveLength(3);
      expect(result.faqs[0].question).toContain(service);
      expect(result.faqs[0].question).toContain(town);
      expect(result.faqs[0].answer).toContain(businessName);
      
      expect(result.faqHtml).toContain('Frequently Asked Questions');
      expect(result.faqHtml).toContain('faq-accordion');
      expect(result.faqSchemaScript).toContain('"@type": "FAQPage"');
    });

    it('should return fallback FAQs when geminiModel is not provided', async () => {
      const result = await generateFaqs(businessName, service, town, true, null);
      expect(result.faqs).toHaveLength(3);
    });
  });

  describe('AI Generated FAQs', () => {
    it('should parse and return AI-generated FAQs when Gemini succeeds', async () => {
      const mockAiFaqs = [
        { question: 'AI Q1 in Austin?', answer: 'AI A1 answer.' },
        { question: 'AI Q2 in Austin?', answer: 'AI A2 answer.' },
        { question: 'AI Q3 in Austin?', answer: 'AI A3 answer.' }
      ];

      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockResolvedValue(JSON.stringify(mockAiFaqs))
        }
      });

      const mockGeminiModel = {
        generateContent: mockGenerateContent
      };

      const result = await generateFaqs(businessName, service, town, true, mockGeminiModel);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(result.faqs).toHaveLength(3);
      expect(result.faqs[0].question).toBe('AI Q1 in Austin?');
      expect(result.faqs[0].answer).toBe('AI A1 answer.');
      expect(result.faqHtml).toContain('AI Q1 in Austin?');
      expect(result.faqSchemaScript).toContain('AI Q1 in Austin?');
    });

    it('should fall back to defaults if Gemini returns invalid JSON', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockResolvedValue('invalid-json')
        }
      });

      const mockGeminiModel = {
        generateContent: mockGenerateContent
      };

      const result = await generateFaqs(businessName, service, town, true, mockGeminiModel);

      expect(mockGenerateContent).toHaveBeenCalled();
      // Should fall back to default questions (which have length 3)
      expect(result.faqs).toHaveLength(3);
      expect(result.faqs[0].question).toContain('How do I choose');
    });
  });
});
