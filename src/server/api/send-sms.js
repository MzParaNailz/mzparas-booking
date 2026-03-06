import { sendSMS } from "../server/sendSMS.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: "Missing 'to' or 'message'" });
  }

  try {
    const result = await sendSMS(to, message);
    return res.status(200).json({ success: true, sid: result.sid });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}