import twilio from "twilio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const hasSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasToken = !!process.env.TWILIO_AUTH_TOKEN;
  const hasPhone = !!process.env.TWILIO_PHONE_NUMBER;
  const testSms = process.env.TEST_SMS || null;

  if (!hasSid || !hasToken || !hasPhone) {
    return res.status(500).json({
      success: false,
      debug: {
        hasSid,
        hasToken,
        hasPhone,
        testSms,
      },
    });
  }

  const { to, message } = req.body || {};

  if (!to || !message) {
    return res.status(400).json({
      error: "Missing 'to' or 'message'",
    });
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return res.status(200).json({
      success: true,
      sid: result.sid,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}