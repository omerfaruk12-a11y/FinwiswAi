import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendNewsletterWelcomeEmail } from "@/lib/email";
import {
  internalErrorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const newsletterSchema = z.object({
  email: z.string().email(),
});
const SYSTEM_AUDIT_ADMIN_ID = process.env.SYSTEM_AUDIT_ADMIN_ID || "system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const email = parsed.data.email.toLowerCase();

    await prisma.adminAuditLog.create({
      data: {
        adminId: SYSTEM_AUDIT_ADMIN_ID,
        action: "NEWSLETTER_SUBSCRIBED",
        targetType: "Newsletter",
        targetId: email,
        metadataJson: JSON.stringify({
          email,
          subscribedAt: new Date().toISOString(),
        }),
      },
    });

    const newsletterEmailSent = await sendNewsletterWelcomeEmail(email);
    if (!newsletterEmailSent) {
      throw new Error("NEWSLETTER_EMAIL_SEND_FAILED");
    }

    return successResponse({
      message: "E-posta adresiniz finansal ipuclari listesine eklendi.",
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
