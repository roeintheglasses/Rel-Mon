/**
 * Human-readable labels for release statuses
 */
export const STATUS_LABELS: Record<string, string> = {
  PLANNING: "Planning",
  IN_DEVELOPMENT: "In Development",
  IN_REVIEW: "In Review",
  READY_STAGING: "Ready for Staging",
  IN_STAGING: "In Staging",
  STAGING_VERIFIED: "Staging Verified",
  READY_PRODUCTION: "Ready for Production",
  DEPLOYED: "Deployed",
  CANCELLED: "Cancelled",
  ROLLED_BACK: "Rolled Back",
};

/**
 * Background colors for release status badges
 */
export const STATUS_COLORS: Record<string, string> = {
  PLANNING: "bg-slate-500",
  IN_DEVELOPMENT: "bg-blue-500",
  IN_REVIEW: "bg-purple-500",
  READY_STAGING: "bg-yellow-500",
  IN_STAGING: "bg-orange-500",
  STAGING_VERIFIED: "bg-teal-500",
  READY_PRODUCTION: "bg-green-500",
  DEPLOYED: "bg-emerald-600",
  CANCELLED: "bg-gray-500",
  ROLLED_BACK: "bg-red-500",
};

/**
 * Emoji icons for release statuses (used in Slack notifications)
 */
export const STATUS_EMOJI: Record<string, string> = {
  PLANNING: "📋",
  IN_DEVELOPMENT: "🔨",
  IN_REVIEW: "👀",
  READY_STAGING: "🎯",
  IN_STAGING: "🧪",
  STAGING_VERIFIED: "✅",
  READY_PRODUCTION: "🚀",
  DEPLOYED: "🎉",
  CANCELLED: "❌",
  ROLLED_BACK: "⏪",
};

/**
 * Background colors for release priority badges
 */
export const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-500",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

/**
 * Background colors for priority badges with text color variants
 */
export const PRIORITY_BADGE_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

/**
 * Status options for select dropdowns
 */
export const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "IN_DEVELOPMENT", label: "In Development" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "READY_STAGING", label: "Ready for Staging" },
  { value: "IN_STAGING", label: "In Staging" },
  { value: "STAGING_VERIFIED", label: "Staging Verified" },
  { value: "READY_PRODUCTION", label: "Ready for Production" },
  { value: "DEPLOYED", label: "Deployed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ROLLED_BACK", label: "Rolled Back" },
] as const;
