import twilio from "twilio";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, message } = req.body || {};

  console.log("SMS REQUEST BODY:", { to, message });

  if (!to || !message) {
    return res.status(400).json({ error: "Missing 'to' or 'message'" });
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

    console.log("SMS SENT:", { to, sid: result.sid });

    return res.status(200).json({
      success: true,
      sid: result.sid,
    });
  } catch (error) {
    console.error("SMS ERROR:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}