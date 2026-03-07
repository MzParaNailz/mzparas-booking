import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Mz Para's Nailz Booking Deposit",
              description: "$50 non-refundable deposit",
            },
            unit_amount: 5000,
          },
          quantity: 1,
        },
      ],
      success_url: "https://mzparas-booking.vercel.app/?deposit=success",
      cancel_url: "https://mzparas-booking.vercel.app/?deposit=cancel",
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}