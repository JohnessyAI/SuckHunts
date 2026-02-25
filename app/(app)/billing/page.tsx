"use client";

import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <div>
      <h1 className="font-outfit text-2xl font-bold mb-2">Billing</h1>
      <p className="text-sm text-gray-500 mb-8">
        Manage your subscription
      </p>

      <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-outfit text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Stripe-powered subscription management with Free, Basic, and Pro tiers.
        </p>
      </div>
    </div>
  );
}
