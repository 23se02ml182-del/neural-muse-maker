

## Plan: Add Google Gemini API Key as Fallback

The 402 error means your Lovable workspace AI credits are exhausted. Instead of the local Express setup from the tutorial (which won't work on Lovable Cloud), we'll add your own Gemini API key as a fallback directly in the existing edge functions.

### How it works

Both edge functions (`generate-logo` and `logo-advisor`) currently use `LOVABLE_API_KEY` via the Lovable AI Gateway. We'll update them to:
1. Try `LOVABLE_API_KEY` first (free credits when available)
2. If it returns 402, automatically fall back to your own `GEMINI_API_KEY` calling Google's API directly

### Steps

**Step 1 — Add your Gemini API key as a secret**
You'll be prompted to securely store your Google AI Studio API key (the `AIzaSy...` key from Google AI Studio → "Get API key").

**Step 2 — Update `supabase/functions/logo-advisor/index.ts`**
- Add a fallback path: when the gateway returns 402, retry the same request using `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent` with `GEMINI_API_KEY`
- Convert Google's streaming response format to SSE for the frontend

**Step 3 — Update `supabase/functions/generate-logo/index.ts`**
- Add the same fallback: when gateway returns 402, call `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent` with `GEMINI_API_KEY`
- Extract base64 image data from Google's native response format (`candidates[0].content.parts[].inlineData`)

**Step 4 — No frontend changes needed**
The fallback is entirely server-side. The frontend already handles errors gracefully.

### Important notes
- The Google free tier has its own rate limits (~15 requests/minute for free, ~2 image generations/minute)
- Image generation models (`gemini-3-pro-image-preview`) may require Google Cloud billing enabled even on AI Studio
- Text models (`gemini-2.5-flash`) work on the free tier

