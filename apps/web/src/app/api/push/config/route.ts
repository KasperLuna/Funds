import { NextResponse } from "next/server";

// Public VAPID key (non-secret half) needed client-side for
// pushManager.subscribe. Served at runtime so dev and prod both read the same
// VAPID_PUBLIC_KEY env the worker uses — no build-time inlining of secrets.
export function GET() {
  return NextResponse.json({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  });
}
