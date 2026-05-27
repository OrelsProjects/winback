import { startOfDay } from "date-fns";

export const startOfUtcDay = () => {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
};

export const formatRelativeDays = (date: Date | null | undefined): string => {
  if (!date) return "—";
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
};

export const daysSince = (date: Date | null | undefined): number | null => {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
};

export { startOfDay };
