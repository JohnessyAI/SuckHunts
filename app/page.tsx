"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  BarChart3,
  MonitorPlay,
  Users,
  Palette,
  Share2,
  Check,
  ArrowRight,
  Gamepad2,
  Trophy,
  Radio,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

const features = [
  {
    icon: Gamepad2,
    title: "7,700+ Games",
    description:
      "Instantly search our database of thousands of slots. Auto-populated with images, RTP, volatility, and more.",
  },
  {
    icon: Zap,
    title: "Real-Time Tracking",
    description:
      "Go live and record results as you play. Your viewers see every spin result update instantly via WebSockets.",
  },
  {
    icon: MonitorPlay,
    title: "OBS Overlays",
    description:
      "Drag-and-drop overlay editor with scenes. One URL for OBS — switch layouts via chat commands or mod dashboard.",
  },
  {
    icon: BarChart3,
    title: "Deep Statistics",
    description:
      "Track your performance across every game, every hunt. See your best games, worst games, and everything between.",
  },
  {
    icon: Palette,
    title: "Full Customization",
    description:
      "Build your own overlay scenes with widgets — hunt tables, biggest wins, currently playing, timers, and more.",
  },
  {
    icon: Share2,
    title: "Instant Sharing",
    description:
      "Share completed hunts to Discord, embed them on your website, or post rich previews to social media.",
  },
];

const steps = [
  {
    step: "01",
    icon: Gamepad2,
    title: "Create Your Hunt",
    description:
      "Search our game database, pick your slots, set your bet sizes. Load from presets or build from scratch.",
  },
  {
    step: "02",
    icon: Radio,
    title: "Go Live",
    description:
      "Hit the live button and start opening bonuses. Record each result with one click — viewers see it all in real-time.",
  },
  {
    step: "03",
    icon: Trophy,
    title: "Share & Analyze",
    description:
      "When the hunt is over, share it everywhere. Dive into your stats, see your ROI, and plan the next one.",
  },
];

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try it out — no credit card needed.",
    features: [
      "3 hunts per month",
      "Game search & quick-add",
      "Basic stats",
      "Hunt control panel",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Basic",
    price: "$9",
    period: "/month",
    description: "For streamers ready to level up.",
    features: [
      "Unlimited hunts",
      "Public viewer page",
      "Real-time updates",
      "Full statistics",
      "Share to socials",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "Full power for serious streamers.",
    features: [
      "Everything in Basic",
      "OBS overlay editor",
      "Custom scenes & widgets",
      "Chat bot commands (Kick)",
      "Mod dashboard",
      "Custom branding",
      "Discord embeds",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <main className="relative">
      <Navbar />

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background orbs */}
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-gray-400">
              Now in beta — free to try
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-outfit text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6"
          >
            Track Your{" "}
            <span className="text-gradient-red">Bonus Hunts</span>
            <br />
            Like a Pro
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            The all-in-one bonus hunt tracker built for Kick streamers. Create
            hunts, track results in real-time, build custom OBS overlays, and
            share everything with your viewers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="cta-glow bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-8 py-4 rounded-xl font-medium transition-all hover:scale-105 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 flex items-center gap-2"
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <a
              href="#features"
              className="text-gray-400 hover:text-white px-8 py-4 rounded-xl font-medium transition-all border border-white/10 hover:border-white/20 hover:bg-white/5"
            >
              See Features
            </a>
          </motion.div>

          {/* Hero mock preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-16 sm:mt-20 relative"
          >
            <div className="glass-card rounded-2xl p-1 shadow-2xl shadow-red-500/5">
              <div className="rounded-xl bg-gradient-to-b from-[#0a0a0a] to-[#050505] p-4 sm:p-6">
                {/* Mock hunt table */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-white">
                      Tuesday Night Hunt — LIVE
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Cost:{" "}
                      <span className="text-white font-medium">$2,450</span>
                    </span>
                    <span>
                      Won:{" "}
                      <span className="text-green-400 font-medium">
                        $3,812
                      </span>
                    </span>
                    <span>
                      Profit:{" "}
                      <span className="text-green-400 font-medium">
                        +$1,362
                      </span>
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    {
                      game: "Gates of Olympus",
                      bet: "$2",
                      cost: "$200",
                      result: "$1,243",
                      mult: "621.5x",
                      status: "completed",
                    },
                    {
                      game: "Sweet Bonanza",
                      bet: "$1",
                      cost: "$100",
                      result: "$87",
                      mult: "87.0x",
                      status: "completed",
                    },
                    {
                      game: "Wanted Dead or a Wild",
                      bet: "$2",
                      cost: "$400",
                      result: null,
                      mult: null,
                      status: "playing",
                    },
                    {
                      game: "Sugar Rush",
                      bet: "$1",
                      cost: "$150",
                      result: null,
                      mult: null,
                      status: "pending",
                    },
                    {
                      game: "Big Bass Bonanza",
                      bet: "$0.50",
                      cost: "$50",
                      result: null,
                      mult: null,
                      status: "pending",
                    },
                  ].map((entry, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm ${
                        entry.status === "playing"
                          ? "bg-red-500/10 border border-red-500/20"
                          : entry.status === "completed"
                          ? "bg-white/[0.02]"
                          : "bg-white/[0.01] opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-white/5 flex-shrink-0" />
                        <span
                          className={`truncate ${
                            entry.status === "playing"
                              ? "text-white font-medium"
                              : "text-gray-300"
                          }`}
                        >
                          {entry.game}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-gray-500 flex-shrink-0">
                        <span className="w-12 text-right">{entry.bet}</span>
                        <span className="w-14 text-right">{entry.cost}</span>
                        <span
                          className={`w-16 text-right font-medium ${
                            entry.result
                              ? parseFloat(entry.result.replace(/[$,]/g, "")) >
                                parseFloat(entry.cost.replace(/[$,]/g, ""))
                                ? "text-green-400"
                                : "text-red-400"
                              : "text-gray-600"
                          }`}
                        >
                          {entry.result ?? "—"}
                        </span>
                        <span
                          className={`w-14 text-right ${
                            entry.status === "playing"
                              ? "text-red-400 animate-pulse"
                              : entry.mult
                              ? "text-gray-400"
                              : "text-gray-600"
                          }`}
                        >
                          {entry.status === "playing"
                            ? "LIVE"
                            : entry.mult ?? "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Glow beneath */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-2/3 h-20 bg-red-500/10 blur-3xl rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 sm:py-32 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-sm font-medium text-red-500 uppercase tracking-wider mb-3"
            >
              Features
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-outfit text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            >
              Everything You Need to{" "}
              <span className="text-gradient-red">Stream Hunts</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-gray-400 max-w-2xl mx-auto"
            >
              From game search to OBS overlays to social sharing — one platform
              handles it all.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="glass-card glass-card-glow rounded-2xl p-6 sm:p-8 border border-white/5 hover:border-red-500/20 transition-all duration-500 group h-full hover:translate-y-[-4px] hover:shadow-xl hover:shadow-red-500/5"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-5 group-hover:bg-red-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-outfit text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider max-w-4xl mx-auto" />

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 sm:py-32 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-sm font-medium text-red-500 uppercase tracking-wider mb-3"
            >
              How It Works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-outfit text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            >
              Three Steps to a{" "}
              <span className="text-gradient-red">Better Hunt</span>
            </motion.h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="text-center"
              >
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/20 to-red-500/10 border border-red-500/20 mb-6">
                  <step.icon className="w-7 h-7 text-red-500" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </div>
                <h3 className="font-outfit text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider max-w-4xl mx-auto" />

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 sm:py-32 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-sm font-medium text-red-500 uppercase tracking-wider mb-3"
            >
              Pricing
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="font-outfit text-3xl sm:text-4xl lg:text-5xl font-bold mb-4"
            >
              Simple, Transparent{" "}
              <span className="text-gradient-red">Pricing</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-gray-400 max-w-xl mx-auto"
            >
              Start for free, upgrade when you&apos;re ready. No hidden fees.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className={`relative glass-card rounded-2xl p-6 sm:p-8 border transition-all duration-500 hover:translate-y-[-4px] ${
                  tier.highlight
                    ? "border-red-500/30 shadow-lg shadow-red-500/10"
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-xs font-medium text-white">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-outfit text-xl font-semibold text-white mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {tier.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-outfit text-4xl font-bold text-white">
                      {tier.price}
                    </span>
                    <span className="text-sm text-gray-500">{tier.period}</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`block text-center py-3 rounded-xl text-sm font-medium transition-all ${
                    tier.highlight
                      ? "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105"
                      : "border border-white/10 text-white hover:bg-white/5 hover:border-white/20"
                  }`}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider max-w-4xl mx-auto" />

      {/* ─── Bottom CTA ─── */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        <div className="hero-orb hero-orb-1" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="font-outfit text-3xl sm:text-4xl lg:text-5xl font-bold mb-6"
            >
              Ready to Level Up Your{" "}
              <span className="text-gradient-red">Bonus Hunts</span>?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-gray-400 text-lg mb-10 max-w-xl mx-auto"
            >
              Join streamers who are already using BonusHunt to track, share,
              and engage their audience like never before.
            </motion.p>
            <motion.div variants={fadeUp} custom={2}>
              <Link
                href="/login"
                className="cta-glow inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-10 py-4 rounded-xl font-medium transition-all hover:scale-105 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 text-lg"
              >
                Get Started Free
                <ArrowRight size={20} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
