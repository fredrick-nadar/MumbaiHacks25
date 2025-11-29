# ElevenLabs TTS Integration Guide

## Overview

The VoiceAgent now uses **ElevenLabs** for high-quality text-to-speech (TTS) instead of Twilio's default Google Cloud TTS voices. This provides more natural, expressive voice output across all supported languages.

## Features

✅ **High-Quality Voice**: Using ElevenLabs "tripti" voice (Voice ID: `1Z7Y8o9cvUeWq8oLKgMY`)  
✅ **Multilingual Support**: `eleven_multilingual_v2` model supports Hindi, Tamil, Telugu, and English  
✅ **Automatic Fallback**: Falls back to Twilio TTS if ElevenLabs API fails  
✅ **Audio Caching**: Generated audio files are cached and automatically cleaned up after 1 hour  
✅ **Voice Customization**: Configurable stability, similarity boost, and style parameters

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=sk_f0d4f9b8d2dbd25df2afd45b617d39f6aff84270941c4463
ELEVENLABS_VOICE_ID=1Z7Y8o9cvUeWq8oLKgMY
ELEVENLABS_VOICE_NAME=tripti
```

### Voice Settings

The default voice settings in `elevenlabsService.js`:

```javascript
{
  stability: 0.5,           // Voice consistency (0-1)
  similarity_boost: 0.75,   // Voice similarity to original (0-1)
  style: 0.0,              // Style exaggeration (0-1)
  use_speaker_boost: true  // Enhanced clarity
}
```

## Architecture

### Files Modified/Created

1. **`services/elevenlabsService.js`** (NEW)
   - Handles ElevenLabs API calls
   - Manages audio file caching
   - Automatic cleanup of old files

2. **`twilioAgent.js`** (MODIFIED)
   - Integrated ElevenLabs for all voice responses
   - Fallback to Twilio TTS on errors
   - Uses `<Play>` verb instead of `<Say>` for audio

3. **`server.js`** (MODIFIED)
   - Added static file serving for audio files
   - Serves cached audio from `/audio` endpoint

4. **`config/env.js`** (MODIFIED)
   - Added ElevenLabs configuration object

## How It Works

### Flow Diagram

```
User speaks → Twilio STT → Master Agent
                                ↓
                    Generate text response
                                ↓
                    ElevenLabs TTS API
                                ↓
                    Save MP3 to audio_cache/
                                ↓
                    Return public URL
                                ↓
                    Twilio plays audio via <Play>
```

### Code Flow

1. **Incoming Call**
   ```javascript
   handleIncomingCall() 
   → elevenlabsService.generateSpeech(greeting)
   → Save to audio_cache/
   → twiml.play(audioUrl)
   ```

2. **Processing Response**
   ```javascript
   processVoiceInput()
   → masterAgent.handleQuery()
   → elevenlabsService.generateSpeech(response)
   → twiml.play(audioUrl)
   ```

3. **Fallback on Error**
   ```javascript
   try {
     audioPath = await elevenlabsService.generateSpeech(text);
     twiml.play(audioUrl);
   } catch (error) {
     // Fallback to Twilio TTS
     twiml.say(voiceConfig, text);
   }
   ```

## Audio File Management

### Caching Strategy

- Audio files are saved to `audio_cache/` directory
- Filename format: `{timestamp}-{random}.mp3`
- Files older than 1 hour are automatically deleted
- Cleanup runs every hour via `setInterval()`

### Public URL Format

```
https://{ngrok-url}/audio/{filename}.mp3
```

Example:
```
https://ce5c19237a0f.ngrok-free.app/audio/1703856789123-a7b3c9d.mp3
```

## Testing

### Test ElevenLabs Integration

1. **Check Audio Cache Directory**
   ```powershell
   ls VoiceAgent/audio_cache
   ```

2. **Make a Test Call**
   ```powershell
   node makeCall.js
   ```

3. **Check Server Logs**
   ```
   [ElevenLabs] Generating speech for: "नमस्ते! मैं आपका वित्तीय सहायक हूँ..."
   [ElevenLabs] Audio saved to: /path/to/audio_cache/1703856789123-a7b3c9d.mp3
   ```

4. **Test Audio URL Directly**
   ```
   https://{ngrok-url}/audio/{filename}.mp3
   ```

### Test Voice Quality

Call your Twilio number and listen for:
- Clear, natural voice quality
- Proper pronunciation of Hindi/Tamil/Telugu text
- Smooth audio playback without stuttering

## Voice Customization

### Change Voice Settings

Edit `services/elevenlabsService.js`:

```javascript
async generateSpeech(text, options = {}) {
  const {
    stability = 0.7,           // Higher = more consistent
    similarityBoost = 0.8,     // Higher = closer to original
    style = 0.2,              // Higher = more expressive
    useSpeakerBoost = true
  } = options;
  // ...
}
```

### Use Different Voice

1. Get available voices:
   ```javascript
   const voices = await elevenlabsService.getVoices();
   console.log(voices);
   ```

2. Update `.env`:
   ```env
   ELEVENLABS_VOICE_ID=<new-voice-id>
   ELEVENLABS_VOICE_NAME=<new-voice-name>
   ```

## Troubleshooting

### Issue: Audio files not playing

**Solution:**
- Ensure ngrok is running and `NGROK_URL` is set in `.env`
- Check that `audio_cache/` directory exists
- Verify audio URL is accessible: `{ngrok-url}/audio/{filename}.mp3`

### Issue: ElevenLabs API errors

**Solution:**
- Verify API key is correct in `.env`
- Check ElevenLabs account quota/credits
- Review error logs: `[ElevenLabs] TTS Error:`
- System will automatically fallback to Twilio TTS

### Issue: Voice sounds robotic

**Solution:**
- Adjust voice settings (stability, similarity_boost)
- Try different voice ID
- Check if using `eleven_multilingual_v2` model

### Issue: Audio files piling up

**Solution:**
- Cleanup runs automatically every hour
- Manual cleanup:
  ```javascript
  elevenlabsService.cleanupOldFiles();
  ```

## API Rate Limits

ElevenLabs Free Tier:
- 10,000 characters/month
- ~333 characters per call (average)
- ~30 calls per month

**Recommendation:** Monitor usage in ElevenLabs dashboard

## Benefits Over Twilio TTS

| Feature | ElevenLabs | Twilio Default |
|---------|-----------|----------------|
| Voice Quality | Natural, expressive | Robotic, flat |
| Multilingual | Native support | Translation-based |
| Customization | High (stability, style) | Limited |
| Indian Languages | Excellent | Good |
| Cost | Pay per character | Included with Twilio |

## Next Steps

1. ✅ ElevenLabs integrated
2. ✅ Audio caching implemented
3. ✅ Fallback mechanism added
4. 🔄 Test with real phone calls
5. 🔄 Monitor API usage
6. 🔄 Optimize voice settings for each language

## Resources

- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [Voice Settings Guide](https://elevenlabs.io/docs/speech-synthesis/voice-settings)
- [Multilingual Model](https://elevenlabs.io/docs/speech-synthesis/models#eleven-multilingual-v2)
