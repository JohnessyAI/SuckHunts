import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export const PLANS = {
  basic: {
    priceId: process.env.STRIPE_PRICE_BASIC!,
    name: "Basic",
    price: 9,
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO!,
    name: "Pro",
    price: 19,
  },
} as const;
