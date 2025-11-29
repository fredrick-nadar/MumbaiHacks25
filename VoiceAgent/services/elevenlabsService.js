/**
 * ElevenLabs TTS Service
 * Handles text-to-speech conversion using ElevenLabs API
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config } from '../config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ElevenLabsService {
  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: config.elevenlabs.apiKey
    });
    this.voiceId = config.elevenlabs.voiceId;
    this.voiceName = config.elevenlabs.voiceName;
    
    // Create audio cache directory
    this.audioDir = path.join(__dirname, '../audio_cache');
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * Generate speech from text using ElevenLabs
   * @param {string} text - Text to convert to speech
   * @param {object} options - Optional settings
   * @returns {Promise<string>} Path to generated audio file
   */
  async generateSpeech(text, options = {}) {
    try {
      const {
        stability = 0.5,
        similarityBoost = 0.75,
        style = 0.0,
        useSpeakerBoost = true
      } = options;

      console.log(`[ElevenLabs] Generating speech for: "${text.substring(0, 50)}..."`);

      const audioStream = await this.client.textToSpeech.convert(this.voiceId, {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
          use_speaker_boost: useSpeakerBoost
        }
      });

      // Save audio to file
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
      const filepath = path.join(this.audioDir, filename);
      
      const writeStream = fs.createWriteStream(filepath);
      
      // Convert async iterator to stream
      for await (const chunk of audioStream) {
        writeStream.write(chunk);
      }
      
      writeStream.end();
      
      // Wait for write to complete
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      console.log(`[ElevenLabs] Audio saved to: ${filepath}`);
      
      return filepath;
    } catch (error) {
      console.error('[ElevenLabs] TTS Error:', error.message);
      throw new Error(`ElevenLabs TTS failed: ${error.message}`);
    }
  }

  /**
   * Clean up old audio files (older than 1 hour)
   */
  cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.audioDir);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);

      files.forEach(file => {
        const filepath = path.join(this.audioDir, file);
        const stats = fs.statSync(filepath);
        
        if (stats.mtimeMs < oneHourAgo) {
          fs.unlinkSync(filepath);
          console.log(`[ElevenLabs] Cleaned up old file: ${file}`);
        }
      });
    } catch (error) {
      console.error('[ElevenLabs] Cleanup error:', error.message);
    }
  }

  /**
   * Get available voices from ElevenLabs
   * @returns {Promise<Array>} List of available voices
   */
  async getVoices() {
    try {
      const voices = await this.client.voices.getAll();
      return voices;
    } catch (error) {
      console.error('[ElevenLabs] Get voices error:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const elevenlabsService = new ElevenLabsService();

// Cleanup old files every hour
setInterval(() => {
  elevenlabsService.cleanupOldFiles();
}, 60 * 60 * 1000);

export default elevenlabsService;
