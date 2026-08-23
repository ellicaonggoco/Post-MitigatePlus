/**
 * MitigatePlus SMS OTP Service
 * Integrates with Semaphore.co API for Philippine mobile numbers (Globe/Smart/DITO/TNT/Sun)
 */

const sendSMS = async (recipientNumber, message) => {
  const apiKey = process.env.SEMAPHORE_API_KEY;

  if (!apiKey || apiKey === 'your_semaphore_api_key_here') {
    console.log(`[SMS DEMO MODE] OTP for ${recipientNumber}: ${message}`);
    return { success: true, mode: 'demo', message: 'SMS logged in demo mode (Add SEMAPHORE_API_KEY to .env for real SMS)' };
  }

  try {
    const postBody = {
      apikey: apiKey,
      number: recipientNumber,
      message: message,
    };
    if (process.env.SEMAPHORE_SENDER_NAME) {
      postBody.sendername = process.env.SEMAPHORE_SENDER_NAME;
    }

    const params = new URLSearchParams(postBody);

    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (response.ok) {
      console.log(`[SMS SENT] Successfully dispatched to ${recipientNumber}:`, data);
      return { success: true, mode: 'live', data };
    } else {
      console.error(`[SMS ERROR] Semaphore API error:`, data);
      return { success: false, mode: 'live', error: data };
    }
  } catch (error) {
    console.error(`[SMS EXCEPTION] Failed to send SMS via Semaphore:`, error.message);
    return { success: false, mode: 'live', error: error.message };
  }
};

module.exports = { sendSMS };
