/**
 * Language Manager - Handles multilingual translation
 */

import Groq from 'groq-sdk';
import { config } from '../../config/env.js';
import { SYSTEM_PROMPTS } from '../../core/prompts.js';

export class LanguageManager {
  constructor() {
    this.groq = new Groq({ apiKey: config.groq.apiKey });
    this.supportedLanguages = {
      en: 'English',
      hi: 'Hindi',
      ta: 'Tamil',
      te: 'Telugu',
    };
  }

  /**
   * Detect language from text
   */
  async detectLanguage(text) {
    try {
      const prompt = `Detect the language of this text and respond with only the language code (en, hi, ta, or te):
"${text}"`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.1,
        max_tokens: 10,
      });

      const detected = completion.choices[0]?.message?.content?.trim().toLowerCase();
      
      // Validate detected language
      if (this.supportedLanguages[detected]) {
        return detected;
      }

      // Default to English if detection fails
      return 'en';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en';
    }
  }

  /**
   * Translate text to target language
   */
  async translate(text, targetLang) {
    // Skip translation if already in English or target is English
    if (targetLang === 'en') {
      return text;
    }

    try {
      const languageName = this.supportedLanguages[targetLang] || 'Hindi';
      const systemPrompt = SYSTEM_PROMPTS.TRANSLATION.replace('{language}', languageName);

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text on error
    }
  }

  /**
   * Translate to English for processing
   */
  async translateToEnglish(text, sourceLang) {
    if (sourceLang === 'en') {
      return text;
    }

    try {
      const prompt = `Translate this ${this.supportedLanguages[sourceLang]} text to English:
"${text}"

Respond with only the English translation, no explanations.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: config.groq.model || 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Translation to English error:', error);
      return text;
    }
  }

  /**
   * Get language name
   */
  getLanguageName(code) {
    return this.supportedLanguages[code] || 'English';
  }

  /**
   * Check if language is supported
   */
  isSupported(languageCode) {
    return this.supportedLanguages.hasOwnProperty(languageCode);
  }
}

export const languageManager = new LanguageManager();
