import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  // No DSN configured -> Sentry silently no-ops, same fallback contract as
  // getAIProvider() and sendEmail().
});
