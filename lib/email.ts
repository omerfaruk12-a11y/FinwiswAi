import nodemailer from "nodemailer";
import { Resend } from "resend";

const emailProvider = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
const resendApiKey = process.env.RESEND_API_KEY?.trim() || "";
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
const smtpPort = Number(process.env.SMTP_PORT || "465");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
const smtpSecure = parseBoolean(process.env.SMTP_SECURE, smtpPort === 465);
const parsedFrom = parseMailFrom(process.env.MAIL_FROM || process.env.SMTP_FROM || "");

const mailFromEmail =
  process.env.MAIL_FROM_EMAIL ||
  process.env.SMTP_FROM_EMAIL ||
  parsedFrom.email ||
  smtpUser;

const mailFromName =
  process.env.MAIL_FROM_NAME ||
  process.env.SMTP_FROM_NAME ||
  parsedFrom.name ||
  "FinWise AI";

const emailTimeoutMs = Number(process.env.SMTP_TIMEOUT_MS || "8000");
const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
const logoUrl = `${appBaseUrl}/favicon.svg`;

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseMailFrom(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { name: "", email: "" };

  const match = trimmed.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }

  return {
    name: "",
    email: trimmed,
  };
}

const smtpTransport =
  smtpUser.length > 0 && smtpPass.length > 0
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        dnsTimeout: 10000,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })
    : null;

type EmailTemplateType =
  | "password-reset"
  | "welcome"
  | "security-notification"
  | "newsletter-welcome";

type EmailTemplateConfig = {
  type: EmailTemplateType;
  title: string;
  preview: string;
  body: string[];
  actionLabel?: string;
  actionUrl?: string;
};

const EMAIL_ACCENT: Record<EmailTemplateType, { label: string; color: string; bg: string }> = {
  "password-reset": { label: "Şifre sıfırlama", color: "#0f766e", bg: "#effaf7" },
  welcome: { label: "Hoş geldiniz", color: "#047857", bg: "#f0fbf6" },
  "security-notification": { label: "Güvenlik bildirimi", color: "#a16207", bg: "#fff8e8" },
  "newsletter-welcome": { label: "Bülten aboneliği", color: "#0369a1", bg: "#f1f7ff" },
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderParagraphs(lines: string[]) {
  return lines
    .map(
      (line) =>
        `<p style="margin:0 0 14px;color:#1f3654;font-size:15px;line-height:24px;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join("");
}

function renderLogo() {
  return `<img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="FinWise AI" style="display:block;width:44px;height:44px;border:0;outline:none;text-decoration:none;" />`;
}

function buildEmailTemplate({
  type,
  title,
  preview,
  body,
  actionLabel,
  actionUrl,
}: EmailTemplateConfig) {
  const safeTitle = escapeHtml(title);
  const safePreview = escapeHtml(preview);
  const safeActionLabel = actionLabel ? escapeHtml(actionLabel) : null;
  const safeActionUrl = actionUrl ? escapeHtml(actionUrl) : null;
  const accent = EMAIL_ACCENT[type];

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${safeTitle}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f6fb;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f3f6fb;border-collapse:collapse;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 14px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:0;vertical-align:middle;">${renderLogo()}</td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <div style="font-size:18px;font-weight:700;color:#07142b;line-height:22px;">FinWise AI</div>
                      <div style="font-size:12px;color:#53657d;line-height:18px;">Kişisel finans asistanınız</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#ffffff;border:0;border-radius:12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:22px 24px 18px;background-color:${accent.bg};">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                        <tr>
                          <td style="padding:5px 9px;background-color:#ffffff;border:0;border-radius:999px;color:${accent.color};font-size:12px;line-height:16px;font-weight:700;">
                            ${escapeHtml(accent.label)}
                          </td>
                        </tr>
                      </table>
                      <h1 style="margin:14px 0 0;color:#07142b;font-size:24px;line-height:30px;font-weight:700;">${safeTitle}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:24px;">
                      ${renderParagraphs(body)}
                      ${
                        safeActionLabel && safeActionUrl
                          ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 18px;border-collapse:collapse;">
                              <tr>
                                <td bgcolor="#10b981" style="background-color:#10b981;border-radius:8px;">
                                  <a href="${safeActionUrl}" style="display:inline-block;padding:13px 18px;color:#ffffff;text-decoration:none;font-size:14px;line-height:18px;font-weight:700;">${safeActionLabel}</a>
                                </td>
                              </tr>
                            </table>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 16px;border-collapse:collapse;">
                              <tr>
                                <td style="padding:13px 14px;background-color:#f7f9fc;border:0;border-radius:8px;">
                                  <p style="margin:0 0 5px;color:#53657d;font-size:12px;line-height:18px;font-weight:700;">Buton çalışmazsa bağlantı:</p>
                                  <p style="margin:0;color:#07142b;font-size:12px;line-height:18px;word-break:break-all;">${safeActionUrl}</p>
                                </td>
                              </tr>
                            </table>`
                          : ""
                      }
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
                        <tr>
                          <td style="padding-top:12px;border-top:0;">
                            <p style="margin:0;color:#64748b;font-size:12px;line-height:19px;">
                              Bu e-posta FinWise AI hesabınızla ilgili olarak gönderildi. Bu işlemi siz başlatmadıysanız bu mesajı yok sayabilirsiniz.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 4px 0;color:#8a9ab0;font-size:12px;line-height:18px;">
                FinWise AI yalnızca kişisel finans takibi ve farkındalık desteği sunar.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}) {
  const selectedProvider = emailProvider || (resendClient ? "resend" : "smtp");

  try {
    if (selectedProvider === "resend" || resendClient) {
      if (!resendClient) {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Development] Email preview for ${options.to}: ${options.subject}`);
          return true;
        }

        throw new Error("Resend API anahtarı yapılandırılmadı.");
      }

      if (!mailFromEmail) {
        throw new Error("MAIL_FROM_EMAIL tanımlı değil.");
      }

      if (/@gmail\.com$/i.test(mailFromEmail) || /@googlemail\.com$/i.test(mailFromEmail)) {
        throw new Error("Resend için MAIL_FROM_EMAIL domain tabanlı bir adres olmalıdır.");
      }

      const { error } = await resendClient.emails.send({
        from: `${mailFromName} <${mailFromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: mailFromEmail,
        headers: {
          "X-Mailer": "FinWise AI",
          "X-Priority": "3",
          ...options.headers,
        },
      });

      if (error) throw error;
      return true;
    }

    if (!smtpTransport) {
      if (process.env.NODE_ENV === "development") {
        console.log(`[Development] Email preview for ${options.to}: ${options.subject}`);
        return true;
      }
      throw new Error("SMTP yapılandırılmadı.");
    }

    if (!mailFromEmail) {
      throw new Error("MAIL_FROM_EMAIL veya SMTP_USER tanımlı değil.");
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const sendPromise = smtpTransport
      .sendMail({
        from: { name: mailFromName, address: mailFromEmail },
        sender: mailFromEmail,
        envelope: { from: mailFromEmail, to: options.to },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: mailFromEmail,
        headers: {
          "X-Mailer": "FinWise AI",
          "X-Priority": "3",
          ...options.headers,
        },
      })
      .finally(() => {
        if (timeout) clearTimeout(timeout);
      });

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`Email send timed out after ${emailTimeoutMs}ms`)),
        emailTimeoutMs,
      );
    });

    await Promise.race([sendPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const body = [
    "Hesabınız için bir şifre sıfırlama isteği aldık.",
    "Aşağıdaki bağlantı 1 saat boyunca geçerlidir. Süre dolarsa yeni bir istek oluşturabilirsiniz.",
  ];

  return sendMail({
    to: email,
    subject: "FinWise AI şifre sıfırlama bağlantınız",
    text: `${body.join("\n\n")}\n\nŞifremi sıfırla: ${resetUrl}`,
    html: buildEmailTemplate({
      type: "password-reset",
      title: "Şifrenizi sıfırlayın",
      preview: "FinWise AI hesabınız için şifre sıfırlama bağlantısı.",
      body,
      actionLabel: "Şifremi sıfırla",
      actionUrl: resetUrl,
    }),
  });
}

export async function sendWelcomeEmail(email: string, name?: string | null) {
  const greeting = name ? `Merhaba ${name},` : "Merhaba,";
  const body = [
    greeting,
    "FinWise AI hesabınız hazır. Gelir, gider, hedef ve rapor alanlarını kullanmaya başlayabilirsiniz.",
    "Finansal verilerinizi ekledikçe analizleriniz ve önerileriniz daha kişisel hale gelir.",
  ];

  return sendMail({
    to: email,
    subject: "FinWise AI hesabınız hazır",
    text: body.join("\n\n"),
    html: buildEmailTemplate({
      type: "welcome",
      title: "FinWise AI hesabınız hazır",
      preview: "FinWise AI hesabınız başarıyla oluşturuldu.",
      body,
    }),
  });
}

export async function sendSecurityNotificationEmail(
  email: string,
  title: string,
  description: string,
) {
  const body = [description];

  return sendMail({
    to: email,
    subject: `FinWise AI güvenlik bildirimi: ${title}`,
    text: body.join("\n\n"),
    html: buildEmailTemplate({
      type: "security-notification",
      title,
      preview: "FinWise AI hesabınızla ilgili güvenlik bildirimi.",
      body,
    }),
  });
}

export async function sendNewsletterWelcomeEmail(email: string) {
  const body = [
    "FinWise AI finans ipuçları listesine başarıyla kaydoldunuz.",
    "Size yalnızca ürün güncellemeleri ve kişisel finans farkındalığına yönelik kısa içerikler göndereceğiz.",
  ];

  return sendMail({
    to: email,
    subject: "FinWise AI finans ipuçları aboneliğiniz",
    text: body.join("\n\n"),
    html: buildEmailTemplate({
      type: "newsletter-welcome",
      title: "Aboneliğiniz tamamlandı",
      preview: "FinWise AI finans ipuçları listesine kaydınız alındı.",
      body,
    }),
  });
}
