import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  internalErrorResponse,
} from "@/lib/api-response";

const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır."),
  email: z.string().trim().toLowerCase().email("Geçerli bir email adresi girin."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az bir büyük harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az bir rakam içermelidir."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return errorResponse("EMAIL_TAKEN", "Bu email adresi zaten kullanılıyor.", 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        profile: {
          create: {
            onboardingCompleted: false,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const welcomeEmailSent = await sendWelcomeEmail(user.email, user.name);
    if (!welcomeEmailSent) {
      throw new Error("WELCOME_EMAIL_SEND_FAILED");
    }

    return successResponse(user, undefined, 201);
  } catch (error) {
    return internalErrorResponse(error);
  }
}
