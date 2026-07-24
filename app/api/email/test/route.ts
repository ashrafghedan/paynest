import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import {
  EmailConfigurationError,
  getResendClient,
  getTestEmailAddresses,
} from "@/lib/resend";

export const runtime = "nodejs";

const SUBJECT = "PayNest email integration is working";

const TEXT = `PayNest email integration is working

Your Resend connection is configured correctly and PayNest can send transactional emails.

This is a test message sent by the PayNest email test endpoint.`;

const HTML = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f0f7ff;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f7ff;padding:40px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e0eefe;border-radius:16px;overflow:hidden">
            <tr>
              <td style="background:#006fc6;padding:24px 32px;color:#ffffff;font-size:24px;font-weight:700">
                PayNest
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px">
                <div style="display:inline-block;margin-bottom:20px;padding:6px 12px;border-radius:999px;background:#e0eefe;color:#0259a1;font-size:13px;font-weight:700">
                  Email connected
                </div>
                <h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;color:#0f172a">
                  Your email integration is working
                </h1>
                <p style="margin:0;font-size:16px;line-height:1.65;color:#475569">
                  Resend is configured correctly, and PayNest can now send transactional emails.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">
                This is a test message sent by the PayNest email test endpoint.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// Temporary test endpoint. It intentionally accepts no request body or mail fields.
export async function POST(req: NextRequest) {
  const limited = rateLimit(`email-test:${getClientIp(req)}`, 3, 60 * 60_000);
  if (limited) return limited;

const body = await req.text();

if (body.trim().length > 0) {
  return NextResponse.json(
    { ok: false, error: "This endpoint does not accept a request body." },
    { status: 400 },
  );
}

  try {
    const { from, to } = getTestEmailAddresses();
    const { data, error } = await getResendClient().emails.send({
      from,
      to,
      subject: SUBJECT,
      text: TEXT,
      html: HTML,
    });

    if (error) {
      console.error("[email test] Resend rejected the message:", error.message);
      return NextResponse.json(
        { ok: false, error: "Unable to send the test email." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "PayNest test email sent.",
      id: data?.id,
    });
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      console.error(`[email test] ${error.message}`);
      return NextResponse.json(
        { ok: false, error: "Email service is not configured." },
        { status: 500 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown email provider error";
    console.error("[email test] Failed to send:", message);
    return NextResponse.json(
      { ok: false, error: "Unable to send the test email." },
      { status: 502 },
    );
  }
}
