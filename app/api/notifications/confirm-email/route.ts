/**
 * GET /api/notifications/confirm-email?token=...&wallet=...
 *
 * Activates a pending email subscription by matching the confirmation token.
 * Redirects to /notifications?confirmed=true on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet, SUB_KEY } from "../_lib/kv";
import { logger } from "@/app/utils/logger";
import type { SubscriptionRecord } from "@/app/types/notifications";

const log = logger.child("api:confirm-email");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const token = searchParams.get("token");
    const wallet = searchParams.get("wallet");

    if (!token || !wallet) {
      return NextResponse.json(
        { error: "Missing token or wallet parameter" },
        { status: 400 },
      );
    }

    const record = await kvGet<SubscriptionRecord>(SUB_KEY(wallet));

    if (!record?.email) {
      return NextResponse.json(
        { error: "No pending email subscription found" },
        { status: 404 },
      );
    }

    if (record.email.confirmationToken !== token) {
      return NextResponse.json(
        { error: "Invalid or expired confirmation token" },
        { status: 404 },
      );
    }

    if (record.email.status === "active") {
      // Already confirmed — just redirect
      return NextResponse.redirect(
        new URL("/notifications?confirmed=true", request.url),
      );
    }

    const updated: SubscriptionRecord = {
      ...record,
      email: {
        ...record.email,
        status: "active",
        confirmationToken: "", // clear token after use
      },
    };

    await kvSet(SUB_KEY(wallet), updated);

    return NextResponse.redirect(
      new URL("/notifications?confirmed=true", request.url),
    );
  } catch (err) {
    log.error("Internal error confirming email subscription:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
