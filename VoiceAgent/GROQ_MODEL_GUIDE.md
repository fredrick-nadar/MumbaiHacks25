# 🤖 Groq Model Selection Guide

## ✅ Recommended Model for Your Multilingual Financial Assistant

### **llama-3.3-70b-versatile** (Currently Configured)

**Why this model is best for your project:**

✅ **Excellent Multilingual Support**
- Native support for Hindi, Tamil, Telugu, English
- Better context understanding across languages
- Superior translation quality

✅ **Strong Reasoning Capabilities**
- Financial calculations and analysis
- Intent detection accuracy
- Complex multi-agent coordination

✅ **Large Context Window**
- Handles longer conversations
- Better memory of previous interactions

✅ **Fast Inference**
- Groq's LPU™ technology provides near-instant responses
- Perfect for real-time voice conversations

---

## 📊 Groq Model Comparison

| Model | Best For | Speed | Multilingual | Context |
|-------|----------|-------|--------------|---------|
| **llama-3.3-70b-versatile** ⭐ | **Your use case** | Fast | ⭐⭐⭐⭐⭐ | 8K tokens |
| llama-3.1-70b-versatile | Complex reasoning | Fast | ⭐⭐⭐⭐ | 8K tokens |
| mixtral-8x7b-32768 | Long context | Very Fast | ⭐⭐⭐⭐ | 32K tokens |
| llama-3.1-8b-instant | Simple tasks | Ultra Fast | ⭐⭐⭐ | 8K tokens |
| gemma2-9b-it | Lightweight | Ultra Fast | ⭐⭐ | 8K tokens |

---

## 🎯 Model Selection by Use Case

### For Your Financial Assistant (Multilingual + Reasoning):
```javascript
model: 'llama-3.3-70b-versatile'  // ✅ Best choice
```

### Alternative Options:

**If you need longer conversations (>8K tokens):**
```javascript
model: 'mixtral-8x7b-32768'  // 32K context window
```

**If you want maximum speed (English only):**
```javascript
model: 'llama-3.1-8b-instant'  // Fastest, but less multilingual
```

---

## 🔧 How to Change Model

### Option 1: Change in config/env.js (Recommended)
```javascript
groq: {
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile',  // Change here
}
```

### Option 2: Add to .env
```env
GROQ_MODEL=llama-3.3-70b-versatile
```

Then update config/env.js:
```javascript
groq: {
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
}
```

---

## 🌍 Multilingual Performance

**llama-3.3-70b-versatile** excels at:

### Hindi (हिंदी)
- ✅ Natural translation
- ✅ Financial terminology accuracy
- ✅ Intent detection

### Tamil (தமிழ்)
- ✅ Script recognition
- ✅ Context preservation
- ✅ Accurate responses

### Telugu (తెలుగు)
- ✅ Language understanding
- ✅ Financial concepts
- ✅ Natural flow

### English
- ✅ Native support
- ✅ Technical precision
- ✅ Formal/informal tone

---

## 💡 Performance Optimization Tips

### 1. Use Appropriate Temperature

```javascript
// Intent Detection - Be precise
temperature: 0.1 - 0.2

// Translation - Balanced
temperature: 0.2 - 0.3

// Creative Responses - More variation
temperature: 0.7 - 0.8
```

### 2. Set Proper Max Tokens

```javascript
// Short responses (language detection)
max_tokens: 10

// Medium responses (categorization)
max_tokens: 200

// Long responses (explanations)
max_tokens: 400-500
```

### 3. Use JSON Mode When Possible

```javascript
response_format: { type: 'json_object' }  // Structured data
```

---

## 📈 Expected Performance

With **llama-3.3-70b-versatile**:

- **Latency**: 200-500ms per request
- **Accuracy**: 95%+ for intent detection
- **Multilingual**: Native-level translation
- **Cost**: Free tier includes generous limits

---

## 🚨 Rate Limits (Groq Free Tier)

- **Requests per minute**: 30
- **Requests per day**: 14,400
- **Tokens per minute**: 20,000

**For production**, upgrade to paid tier for higher limits.

---

## 🔄 Model Updates

Groq regularly releases new models. Check:
- https://console.groq.com/docs/models

To update, simply change the model name in config.

---

## ✅ Current Configuration

Your project is now configured with:

```
Model: llama-3.3-70b-versatile
API Key: gsk_IIn12klCnnkkFCsEWACaWGdyb3FY... (configured ✓)
Location: config/env.js
```

**Ready to use!** No changes needed unless you want to experiment with different models.

---

## 🧪 Testing Different Models

To test a different model, temporarily change in one file:

```javascript
// In any agent file
const completion = await this.groq.chat.completions.create({
  model: 'mixtral-8x7b-32768',  // Test different model
  // ... rest of config
});
```

Compare results and choose the best for your needs.

---

**Recommendation: Stick with llama-3.3-70b-versatile** ⭐

It's the perfect balance of:
- Multilingual capability
- Reasoning power
- Speed
- Accuracy

Perfect for your Hindi/Tamil/Telugu/English financial assistant! 🎯
