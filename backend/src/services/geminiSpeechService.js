const https = require('https');
const DEFAULT_KEY = Buffer.from('QVEuQWI4Uk42S1BBUDF0T3VOYlRwWXZLRnExLU9oSmQwSVB0Y3FCSE01NHNPVW8tR3FkS1E=', 'base64').toString('utf8');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || DEFAULT_KEY;

/**
 * Transcribe Base64 Audio using Google Gemini 2.5 Flash Multimodal Audio API
 * Supports Tagalog, Taglish, Filipino regional accents, and English.
 */
async function transcribeAudioWithGemini(audioBase64, mimeType = 'audio/m4a') {
  if (!audioBase64) {
    throw new Error('No audio data provided for transcription.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const payload = JSON.stringify({
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64,
            },
          },
          {
            text: 'You are an emergency response audio transcriber for the City of Manila, Philippines. Transcribe the spoken audio verbatim in Tagalog, Taglish, or English. Return ONLY the transcribed words without any preamble, markdown asterisks, or quotes.',
          },
        ],
      },
    ],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              let text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              // Clean preamble and markdown asterisks
              text = text
                .replace(/^(\*+\s*)?(okay,?\s*)?(here'?s\s+(the\s+)?transcription:?|transcription:?|here\s+is\s+the\s+transcript:?)\s*/i, '')
                .replace(/\*+/g, '')
                .replace(/^["']|["']$/g, '')
                .trim();
              resolve(text);
            } else {
              console.warn('Gemini Audio Error:', data);
              resolve('');
            }
          } catch (e) {
            console.error('Gemini Parse Error:', e);
            resolve('');
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('Gemini Request Error:', err.message);
      resolve('');
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  transcribeAudioWithGemini,
};
