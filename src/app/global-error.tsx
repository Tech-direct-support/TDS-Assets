"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import "./globals.css";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en-AU">
      <body className="min-h-dvh flex items-center justify-center bg-white text-ink">
        <div className="text-center px-6">
          <h1 className="text-[18px] font-semibold mb-2">Something went wrong</h1>
          <p className="text-[13px] text-ink-soft">
            The error has been reported. Please refresh the page or try again shortly.
          </p>
        </div>
      </body>
    </html>
  );
}
