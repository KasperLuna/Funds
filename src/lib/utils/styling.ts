/**
 * Consistent styling utilities for modern dashboard components
 */

// Container styles with glass-morphism effect - dense version
export const glassMorphismContainer =
  "relative border rounded-xl border-slate-700/50 bg-gradient-to-br from-slate-900/90 via-slate-800/85 to-slate-900/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group";

// Gradient overlay for hover effects
export const gradientOverlay =
  "absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300";

// Modern card styles - compact version
export const modernCard =
  "group relative flex flex-col gap-1 p-2 rounded-lg bg-gradient-to-br from-slate-800/70 to-slate-700/50 border border-slate-600/50 hover:shadow-lg hover:shadow-slate-900/50 transition-all duration-300 hover:bg-gradient-to-br hover:from-slate-700/80 hover:to-slate-600/60 hover:border-slate-500/70 hover:scale-[1.01]";

// Enhanced progress bar styles - compact
export const progressBarContainer =
  "relative h-4 bg-slate-700/80 rounded-full overflow-hidden shadow-inner";

// Tab styles - compact
export const modernTabs =
  "w-fit bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-1";
export const modernTabTrigger =
  "flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-emerald-300 transition-all duration-300";

// Button styles
export const modernButton =
  "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300";

// Loading skeleton styles
export const loadingSkeleton =
  "relative overflow-hidden bg-gradient-to-r from-slate-800/60 to-slate-700/40 border border-slate-600/50";
export const shimmerEffect =
  "absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent -translate-x-full animate-shimmer pointer-events-none";

// Dense spacing constants
export const spacing = {
  container: "p-2 gap-2", // Reduced from p-4 gap-4
  section: "gap-2 mb-2", // Reduced from gap-3 mb-3
  card: "p-2 gap-1", // Reduced from p-3 gap-2
  small: "px-2 py-1", // Reduced from px-3 py-2
  minimal: "px-1 py-0.5", // For very compact elements
};

// Status colors
export const statusColors = {
  success: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-600",
    shadow: "shadow-emerald-500/20",
  },
  warning: {
    text: "text-orange-300",
    bg: "bg-orange-500/20",
    border: "border-orange-500/30",
    bar: "bg-gradient-to-r from-orange-400 to-orange-500",
    shadow: "shadow-orange-500/25",
  },
  danger: {
    text: "text-red-400",
    bg: "bg-red-500/20",
    border: "border-red-500/30",
    bar: "bg-gradient-to-r from-red-500 to-red-600",
    shadow: "shadow-red-500/30",
  },
  neutral: {
    text: "text-slate-400",
    bg: "bg-slate-500/20",
    border: "border-slate-500/30",
    bar: "bg-gradient-to-r from-slate-500 to-slate-600",
    shadow: "shadow-slate-500/20",
  },
};

// Background gradients
export const backgroundGradients = {
  main: "min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950",
  section: "bg-gradient-to-r from-purple-500/5 to-blue-500/5",
  subtle: "bg-gradient-to-r from-purple-500/3 to-blue-500/3",
};

// Text overflow handling
export const textOverflow = {
  truncate: "truncate", // Basic truncation
  truncateShort: "truncate max-w-[80px]", // Very short text
  truncateMedium: "truncate max-w-[120px]", // Medium text
  truncateLong: "truncate max-w-[200px]", // Longer text
  wrapWords: "break-words", // Allow word wrapping
  ellipsis: "overflow-hidden text-ellipsis whitespace-nowrap", // Standard ellipsis
};

/**
 * Get status color configuration based on condition
 */
export function getStatusColor(
  condition: "success" | "warning" | "danger" | "neutral"
) {
  return statusColors[condition];
}

/**
 * Combine class names with proper spacing
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
