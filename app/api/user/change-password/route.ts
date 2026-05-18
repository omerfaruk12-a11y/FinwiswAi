import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import { getRequiredSession } from "@/lib/session";
import { sendSecurityNotificationEmail } from "@/lib/email";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre zorunludur."),
  newPassword: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir."),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getRequiredSession();
    if (!session) return unauthorizedResponse();

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, email: true },
    });

    if (!user) return unauthorizedResponse();

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return errorResponse("INVALID_PASSWORD", "Mevcut şifre hatalı.", 400);
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    const securityEmailSent = await sendSecurityNotificationEmail(
      user.email,
      "Şifre değiştirildi",
      "Hesabınızın parolası başarıyla değiştirildi. Bu işlemi siz yapmadıysanız hemen destek ile iletişim kurun."
    );
    if (!securityEmailSent) {
      throw new Error("SECURITY_EMAIL_SEND_FAILED");
    }

    return successResponse({ message: "Şifre başarıyla değiştirildi." });
  } catch (error) {
    return internalErrorResponse(error);
  }
}
