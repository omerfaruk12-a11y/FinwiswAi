"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { OwlIcon } from "@/components/brand/owl-icon";

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(6, "Parola en az 6 karakter olmalıdır."),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getSafeCallbackUrl(value: string | null): string {
  if (!value) return "/app";

  try {
    if (typeof window === "undefined") {
      return value.startsWith("/") && !value.startsWith("/auth/") ? value : "/app";
    }

    const url = value.startsWith("/")
      ? new URL(value, window.location.origin)
      : new URL(value);
    if (url.origin !== window.location.origin) return "/app";
    if (url.pathname.startsWith("/auth/")) return "/app";
    return `${url.pathname}${url.search.length < 200 ? url.search : ""}${url.hash}`;
  } catch {
    return "/app";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));

  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe ? "true" : "false",
      });

      if (result?.error) {
        toast.error("E-posta veya parola hatalı.");
      } else {
        const session = await getSession();
        const destination =
          session?.user?.role === "ADMIN" && !callbackUrl.startsWith("/admin")
            ? "/admin"
            : callbackUrl;

        toast.success("Hoş geldin! Yönlendiriliyorsun...");
        router.push(destination);
        router.refresh();
      }
    } catch {
      toast.error("Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-white font-sans text-primary">
      <div className="flex w-full min-w-0 flex-col px-4 py-8 sm:px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="flex items-center gap-2">
          <OwlIcon className="h-10 w-10" />
          <span className="text-xl font-bold tracking-tight text-[#0F172A]">FinWise AI</span>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] min-w-0 flex-1 flex-col justify-center">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-0"
          >
            <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-[#ECFDF5] px-3 py-1.5 text-sm font-medium text-[#10B981]">
              <Sparkles className="h-4 w-4" />
              Akıllı kişisel finans koçun
            </div>

            <h1 className="mb-3 text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
              Tekrar hoş geldin
            </h1>
            <p className="mb-10 text-base text-slate-500">
              Gelir, gider, hedef ve raporlarını yönetmek için hesabına giriş yap.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">E-posta</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="E-posta adresiniz"
                    className="flex h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Parola</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="flex h-12 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 pr-10 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#10B981] focus:ring-[#10B981]"
                    {...register("rememberMe")}
                  />
                  Beni hatırla
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-[#10B981] hover:underline"
                >
                  Parolamı unuttum
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 w-full items-center justify-center rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#059669] disabled:opacity-50"
              >
                Giriş Yap
              </button>

            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Hesabın yok mu?{" "}
              <Link href="/auth/register" className="font-semibold text-[#10B981] hover:underline">
                Ücretsiz hesap oluştur
              </Link>
            </p>
          </motion.div>
        </div>

        <div className="mt-auto text-center text-xs text-slate-400">
          FinWise AI yatırım tavsiyesi vermez; kişisel bütçe
          <br />
          ve finansal farkındalık desteği sağlar.
        </div>
      </div>

      <div className="hidden w-1/2 items-center justify-center overflow-hidden bg-white px-10 lg:flex xl:px-14">
        <div className="w-full max-w-[920px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-2xl">
          <Image
            src="/dashboard-preview1.png"
            alt="FinWise AI dashboard preview"
            width={1200}
            height={800}
            priority
            className="h-auto w-full rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen animate-pulse bg-slate-50" />}>
      <LoginForm />
    </React.Suspense>
  );
}
