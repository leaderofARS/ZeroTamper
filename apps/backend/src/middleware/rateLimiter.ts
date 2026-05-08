import rateLimit from "express-rate-limit";

/** Strict rate limiter for evidence submission (anti-spam). */
export const submitLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many evidence submissions. Please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Legal export rate limiter. */
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Legal export rate limit exceeded." },
  standardHeaders: true,
  legacyHeaders: false,
});
