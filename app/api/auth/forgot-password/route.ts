import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import {
  internalErrorResponse,
  successResponse,
  validationErrorResponse,
} from "@/lib/api-response";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

      if (user?.isActive) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 saat

      await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });
      await prisma.passwordResetToken.create({ data: { email: user.email, token, expires } });

      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
      const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;

      const resetEmailSent = await sendPasswordResetEmail(user.email, resetUrl);
      if (!resetEmailSent) {
        throw new Error("PASSWORD_RESET_EMAIL_SEND_FAILED");
      }

      await prisma.adminAuditLog.create({
        data: {
          adminId: user.id,
          action: "PASSWORD_RESET_REQUESTED",
          targetType: "User",
          targetId: user.id,
          metadataJson: JSON.stringify({ email: user.email }),
        },
      });
    }

    return successResponse({
      message:
        "E-posta sistemde kayıtlıysa parola sıfırlama bağlantısı gönderilecektir.",
    });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
