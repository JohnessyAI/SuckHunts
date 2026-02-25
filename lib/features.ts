export type SubscriptionTier = "free" | "basic" | "pro";

export type Feature =
  | "hunt_create"
  | "game_search"
  | "quick_add"
  | "basic_stats"
  | "public_viewer"
  | "realtime"
  | "full_stats"
  | "unlimited_hunts"
  | "presets"
  | "obs_overlay"
  | "custom_branding"
  | "viewer_count"
  | "sharing"
  | "discord_embed"
  | "chat_commands"
  | "mod_dashboard";

const tierFeatures: Record<SubscriptionTier, Feature[]> = {
  free: ["hunt_create", "game_search", "quick_add", "basic_stats"],
  basic: [
    "hunt_create",
    "game_search",
    "quick_add",
    "basic_stats",
    "public_viewer",
    "realtime",
    "full_stats",
    "unlimited_hunts",
    "sharing",
  ],
  pro: [
    "hunt_create",
    "game_search",
    "quick_add",
    "basic_stats",
    "public_viewer",
    "realtime",
    "full_stats",
    "unlimited_hunts",
    "presets",
    "obs_overlay",
    "custom_branding",
    "viewer_count",
    "sharing",
    "discord_embed",
    "chat_commands",
    "mod_dashboard",
  ],
};

export function checkFeature(tier: string, feature: Feature): boolean {
  return tierFeatures[tier as SubscriptionTier]?.includes(feature) ?? false;
}

export function getTierFeatures(tier: string): Feature[] {
  return tierFeatures[tier as SubscriptionTier] ?? [];
}

export const HUNT_LIMITS: Record<SubscriptionTier, number> = {
  free: 3,
  basic: Infinity,
  pro: Infinity,
};
