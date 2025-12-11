// This file configures the initialization of Sentry on the client.
// This is loaded on the client side using Next.js instrumentation hook.
import * as Sentry from "@sentry/nextjs";
import "../sentry.client.config";

// Export hook for Sentry to instrument router navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
