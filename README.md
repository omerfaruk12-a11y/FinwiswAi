# FinWise AI

FinWise AI, kişisel finans yönetimi için geliştirilmiş yapay zeka destekli bir web uygulamasıdır. Gelir, gider, bütçe, borç, hedef, abonelik, rapor ve finansal sağlık verilerini tek panelde toplar; AI asistanı ise kullanıcının gerçek finansal verilerine göre açıklama, analiz ve aksiyon önerisi üretir.

Uygulama Next.js App Router mimarisi, PostgreSQL, Prisma, Auth.js ve Google Gemini API üzerine kuruludur.

---

## İçindekiler

- [Öne Çıkan Özellikler](#öne-çıkan-özellikler)
- [Ekran Görüntüleri](#ekran-görüntüleri)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Kurulum](#kurulum)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Veritabanı](#veritabanı)
- [Geliştirme](#geliştirme)
- [Production](#production)
- [Proje Yapısı](#proje-yapısı)
- [AI Mimarisi](#ai-mimarisi)
- [Mail Akışları](#mail-akışları)
- [PDF Raporlama](#pdf-raporlama)
- [GitHub'a Eklenmemesi Gerekenler](#githuba-eklenmemesi-gerekenler)
- [Lisans](#lisans)

---

## Öne Çıkan Özellikler

- Gerçek kullanıcı verisine bağlı finansal dashboard
- Gelir, gider ve işlem yönetimi
- Kategori bazlı bütçe takibi
- Finansal hedef oluşturma ve ilerleme analizi
- Borç ve ödeme takibi
- Abonelik yönetimi
- Finansal sağlık skoru
- AI destekli finans asistanı
- AI aksiyon planı
- PDF rapor oluşturma ve indirme
- Profil, güvenlik, veri dışa aktarma ve hesap yönetimi
- Admin paneli
- Kullanıcı, kategori, rapor, AI log ve sistem ayarları yönetimi
- Şifre sıfırlama, hoş geldin, güvenlik bildirimi ve newsletter e-postaları

---

## Ekran Görüntüleri

Ekran görüntüleri `image/` klasörü altında tutulur. GitHub üzerinde doğrudan görüntülenebilir.

### Genel ve Kimlik Doğrulama

| Ana Sayfa | Giriş | Kayıt |
|---|---|---|
| ![Ana Sayfa](image/landing-page.png) | ![Giriş](image/auth-login.png) | ![Kayıt](image/auth-register.png) |

| Şifremi Unuttum | Güvenlik |
|---|---|
| ![Şifremi Unuttum](image/forgot-password.png) | ![Güvenlik](image/security.png) |

| Gizlilik | Çerezler |
|---|---|
| ![Gizlilik](image/privacy.png) | ![Çerezler](image/cookies.png) |

### Kullanıcı Uygulaması

| Dashboard | AI Asistan | Analytics |
|---|---|---|
| ![Dashboard](image/app-home.png) | ![AI Asistan](image/app-assistant.png) | ![Analytics](image/app-analytics.png) |

| Gelirler | Giderler | İşlemler |
|---|---|---|
| ![Gelirler](image/app-income.png) | ![Giderler](image/app-expenses.png) | ![İşlemler](image/app-transactions.png) |

| Bütçe | Hedefler | Hedef Detayı |
|---|---|---|
| ![Bütçe](image/app-budget.png) | ![Hedefler](image/app-goals.png) | ![Hedef Detayı](image/app-goals-detail.png) |

| Borçlar | Abonelikler | Finansal Sağlık |
|---|---|---|
| ![Borçlar](image/app-debts.png) | ![Abonelikler](image/app-subscriptions.png) | ![Finansal Sağlık](image/app-health-score.png) |

| Aksiyon Planı | Raporlar | Ayarlar |
|---|---|---|
| ![Aksiyon Planı](image/app-action-plan.png) | ![Raporlar](image/app-reports.png) | ![Ayarlar](image/app-settings.png) |

| Onboarding |
|---|---|
| ![Onboarding](image/app-onboarding.png) |

### Admin Paneli

| Admin Dashboard | Kategoriler |
|---|---|
| ![Admin Dashboard](image/admin-home.png) | ![Kategoriler](image/admin-categories.png) |

| Admin Analytics | AI Logları | Admin Raporlar |
|---|---|---|
| ![Admin Analytics](image/admin-analytics.png) | ![AI Logları](image/admin-ai-logs.png) | ![Admin Raporlar](image/admin-reports.png) |

| Admin Ayarları |
|---|---|
| ![Admin Ayarları](image/admin-settings.png) |

---

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16, App Router |
| Dil | TypeScript |
| UI | React 19, Tailwind CSS, Radix UI |
| Auth | Auth.js / NextAuth v5 |
| ORM | Prisma |
| Veritabanı | PostgreSQL |
| AI | Google Gemini |
| Grafik | Recharts |
| Form | React Hook Form, Zod |
| Animasyon | Framer Motion |
| Mail | Nodemailer, Resend desteği |
| PDF | Puppeteer |

---

## Kurulum

### Gereksinimler

- Node.js 20 veya üzeri
- PostgreSQL 15 veya üzeri
- Google Gemini API key
- Mail gönderimi için SMTP hesabı veya Resend API key

### Bağımlılıkları yükle

```bash
npm install
```

### Prisma client oluştur

```bash
npx prisma generate
```

### Veritabanı şemasını uygula

```bash
npx prisma db push
```

Bu projede demo seed dosyası kullanılmaz. Veritabanı temiz başlar; kullanıcılar uygulama üzerinden kayıt olur.

---

## Ortam Değişkenleri

Bu proje yalnızca `.env.local` dosyasını aktif olarak kullanır. Tüm ortam değişkenlerini bu dosyada tut.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/finwise_ai"

NEXTAUTH_SECRET="minimum-32-karakter-guclu-secret"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"

GEMINI_API_KEY="google-gemini-api-key"
AI_MODEL="gemini-2.5-flash"
AI_TEMPERATURE="0.3"
AI_MAX_TOKENS="3072"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="FinWise AI"

EMAIL_PROVIDER="smtp"
SMTP_HOST="srvm01.turhost.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="info@finwiseai.com.tr"
SMTP_PASS="smtp-parolaniz"
MAIL_FROM_EMAIL="info@finwiseai.com.tr"
MAIL_FROM_NAME="FinWise AI"

RESEND_API_KEY=""

PDF_STORAGE_PATH="./public/reports"
```

Notlar:

- `NEXTAUTH_SECRET` production ortamında güçlü ve benzersiz olmalıdır.
- `NEXTAUTH_URL` production ortamında gerçek domain olmalıdır.
- `AUTH_TRUST_HOST=true`, reverse proxy ve Docker ortamlarında Auth.js host hatalarını önlemek için kullanılır.
- AI tarafında varsayılan model `gemini-2.5-flash`, fallback model `gemini-2.5-flash-lite` olacak şekilde yapılandırılmıştır.

---

## Veritabanı

Prisma şeması:

```text
prisma/schema.prisma
```

Kullanılan temel veri alanları:

- Kullanıcılar
- Gelirler
- Giderler
- İşlemler
- Bütçeler
- Hedefler
- Borçlar
- Abonelikler
- Raporlar
- AI konuşmaları
- AI logları
- Bildirimler
- Admin ayarları

Veritabanı yönetimi için:

```bash
npx prisma studio
```

---

## Geliştirme

```bash
npm run dev
```

Uygulama varsayılan olarak şu adreste çalışır:

```text
http://localhost:3000
```

Tip kontrolü:

```bash
npx tsc --noEmit
```

Production build:

```bash
npm run build
```

---

## Production

Production ortamında minimum yapı:

- VPS veya container ortamı
- PostgreSQL
- Next.js uygulama sunucusu
- Reverse proxy
- HTTPS / SSL
- SMTP veya mail provider
- Gemini API key

Tipik Docker/VPS akışı:

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm run start
```

Production için kritik kontroller:

- `DATABASE_URL` gerçek PostgreSQL bağlantısını göstermeli
- `NEXTAUTH_URL` domain ile aynı olmalı
- `NEXTAUTH_SECRET` güçlü olmalı
- Mail provider gerçek gönderim yapmalı
- Puppeteer PDF üretimi için sunucu ortamında Chromium uyumu doğrulanmalı
- Reverse proxy HTTPS üzerinden uygulamaya yönlenmeli

---

## Proje Yapısı

```text
FinWise AI/
├─ app/
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ page.tsx
│  ├─ cookies/
│  │  └─ page.tsx
│  ├─ privacy/
│  │  └─ page.tsx
│  ├─ security/
│  │  └─ page.tsx
│  ├─ (auth)/
│  │  ├─ layout.tsx
│  │  └─ auth/
│  │     ├─ login/
│  │     │  └─ page.tsx
│  │     ├─ register/
│  │     │  └─ page.tsx
│  │     ├─ forgot-password/
│  │     │  └─ page.tsx
│  │     └─ reset-password/
│  │        └─ page.tsx
│  ├─ (app)/
│  │  ├─ layout.tsx
│  │  ├─ app-layout-client.tsx
│  │  └─ app/
│  │     ├─ page.tsx
│  │     ├─ action-plan/page.tsx
│  │     ├─ analytics/page.tsx
│  │     ├─ assistant/page.tsx
│  │     ├─ assistant/_components/
│  │     │  ├─ ai-result-actions.tsx
│  │     │  ├─ agent-badge.tsx
│  │     │  ├─ agent-config.tsx
│  │     │  ├─ animated-stream-text.tsx
│  │     │  ├─ conversation-list.tsx
│  │     │  ├─ empty-state.tsx
│  │     │  ├─ follow-up-chips.tsx
│  │     │  ├─ inline-chart.tsx
│  │     │  ├─ markdown-components.tsx
│  │     │  ├─ message-actions.tsx
│  │     │  ├─ message-content.tsx
│  │     │  ├─ sidebar-cards.tsx
│  │     │  └─ slash-command-popover.tsx
│  │     ├─ budget/page.tsx
│  │     ├─ debts/page.tsx
│  │     ├─ expenses/page.tsx
│  │     ├─ goals/page.tsx
│  │     ├─ goals/[id]/page.tsx
│  │     ├─ health-score/page.tsx
│  │     ├─ income/page.tsx
│  │     ├─ onboarding/page.tsx
│  │     ├─ reports/page.tsx
│  │     ├─ settings/page.tsx
│  │     ├─ subscriptions/page.tsx
│  │     └─ transactions/page.tsx
│  └─ admin/
│     ├─ layout.tsx
│     ├─ admin-layout-client.tsx
│     ├─ page.tsx
│     ├─ ai-logs/page.tsx
│     ├─ analytics/page.tsx
│     ├─ categories/page.tsx
│     ├─ reports/page.tsx
│     ├─ settings/page.tsx
│     └─ users/page.tsx
├─ app/api/
│  ├─ ai/
│  │  ├─ action-plan/route.ts
│  │  ├─ analyze-spending/route.ts
│  │  ├─ chat/route.ts
│  │  ├─ chat/stream/route.ts
│  │  ├─ feedback/route.ts
│  │  ├─ income-analysis/route.ts
│  │  └─ report/route.ts
│  ├─ admin/
│  │  ├─ ai-logs/route.ts
│  │  ├─ analytics/route.ts
│  │  ├─ categories/route.ts
│  │  ├─ categories/[id]/route.ts
│  │  ├─ overview/route.ts
│  │  ├─ reports/route.ts
│  │  ├─ reports/[id]/route.ts
│  │  ├─ settings/route.ts
│  │  ├─ users/route.ts
│  │  ├─ users/[id]/route.ts
│  │  └─ users/[id]/reset-password/route.ts
│  ├─ analytics/
│  │  ├─ health-score/route.ts
│  │  ├─ monthly-trend/route.ts
│  │  ├─ overview/route.ts
│  │  └─ spending-by-category/route.ts
│  ├─ auth/
│  │  ├─ [...nextauth]/route.ts
│  │  ├─ forgot-password/route.ts
│  │  ├─ register/route.ts
│  │  └─ reset-password/route.ts
│  ├─ budget/
│  │  ├─ route.ts
│  │  └─ compare/route.ts
│  ├─ categories/route.ts
│  ├─ conversations/
│  │  ├─ route.ts
│  │  ├─ [id]/route.ts
│  │  └─ [id]/title/route.ts
│  ├─ debts/
│  │  ├─ route.ts
│  │  ├─ [id]/route.ts
│  │  └─ recommendations/route.ts
│  ├─ expenses/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  ├─ goals/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  ├─ income/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  ├─ newsletter/route.ts
│  ├─ notifications/route.ts
│  ├─ reports/
│  │  ├─ route.ts
│  │  ├─ [id]/route.ts
│  │  └─ [id]/pdf/route.ts
│  ├─ subscriptions/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  ├─ transactions/
│  │  ├─ route.ts
│  │  └─ [id]/route.ts
│  └─ user/
│     ├─ account/route.ts
│     ├─ avatar/route.ts
│     ├─ change-password/route.ts
│     ├─ export/route.ts
│     ├─ me/route.ts
│     ├─ profile/route.ts
│     └─ sessions/route.ts
├─ components/
│  ├─ brand/
│  │  └─ owl-icon.tsx
│  ├─ layout/
│  │  ├─ app-sidebar.tsx
│  │  └─ app-topbar.tsx
│  └─ ui/
│     ├─ ai-insight-card.tsx
│     ├─ ai-response-card.tsx
│     ├─ badge.tsx
│     ├─ button.tsx
│     ├─ calendar.tsx
│     ├─ calendar-rac.tsx
│     ├─ confirm-modal.tsx
│     ├─ date-picker.tsx
│     ├─ demo.tsx
│     ├─ empty-state.tsx
│     ├─ filter-select.tsx
│     ├─ input.tsx
│     ├─ kanban-column.tsx
│     ├─ loading-skeleton.tsx
│     ├─ prompt-input.tsx
│     ├─ progress-bar.tsx
│     ├─ right-panel.tsx
│     ├─ shining-text.tsx
│     ├─ stat-card.tsx
│     ├─ tab-nav.tsx
│     ├─ textarea.tsx
│     └─ tooltip.tsx
├─ lib/
│  ├─ ai/
│  │  ├─ agents.ts
│  │  ├─ file-parser.ts
│  │  ├─ format-response.ts
│  │  ├─ orchestrator.ts
│  │  ├─ prompts.ts
│  │  ├─ provider.ts
│  │  └─ schemas.ts
│  ├─ finance/
│  │  └─ calculations.ts
│  ├─ api-response.ts
│  ├─ category-utils.ts
│  ├─ email.ts
│  ├─ prisma.ts
│  ├─ session.ts
│  └─ utils.ts
├─ prisma/
│  └─ schema.prisma
├─ public/
│  ├─ dashboard-preview1.png
│  └─ favicon.svg
├─ image/
│  └─ README ekran görüntüleri
├─ docs/
│  ├─ finwise-ai-prompt.md
│  └─ finwise-ai-ui-improvement-prompt.md
├─ types/
│  └─ next-auth.d.ts
├─ auth.ts
├─ next.config.ts
├─ proxy.ts
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ tsconfig.json
├─ tsconfig.scripts.json
├─ package.json
├─ package-lock.json
├─ .env.local
└─ README.md
```

---

## AI Mimarisi

AI katmanı orchestrator tabanlıdır. Kullanıcı mesajı analiz edilir, finansal bağlam hazırlanır ve en uygun ajan çalıştırılır.

Temel ajanlar:

| Ajan | Görev |
|---|---|
| SpendingAnalysisAgent | Harcama analizi |
| IncomeAnalysisAgent | Gelir analizi |
| BudgetPlannerAgent | Bütçe önerileri |
| GoalPlannerAgent | Hedef planlama |
| DebtRiskAgent | Borç risk analizi |
| SubscriptionWasteAgent | Abonelik optimizasyonu |
| FinancialHealthAgent | Finansal sağlık skoru yorumu |
| ActionPlanAgent | Uygulanabilir aksiyon planı |
| ReportAgent | Finansal rapor üretimi |
| ExplanationAgent | Genel finans açıklamaları |

AI cevapları gerçek kullanıcı verisine göre üretilir. Direkt metrik soruları mümkün olduğunda deterministik hesaplanır; genel analiz ve planlama soruları AI ajanlarına yönlendirilir.

---

## Mail Akışları

Uygulamada desteklenen mail akışları:

- Şifre sıfırlama
- Hoş geldin e-postası
- Güvenlik bildirimi
- Newsletter hoş geldin e-postası

Mail gönderimi `lib/email.ts` üzerinden yönetilir. SMTP ve Resend desteklenir.

Production için öneri:

- Kendi domaininle gönderim yap
- SPF, DKIM ve DMARC kayıtlarını kur
- Gmail SMTP yerine mümkünse Resend, Brevo, Mailgun veya Postmark gibi servis kullan
- Turhost kullanıyorsan `srvm01.turhost.com` SMTP hostunu ve panelde verilen port/şifre bilgilerini kullan

---

## PDF Raporlama

Rapor PDF çıktıları Puppeteer ile oluşturulur. Lokal ortamda doğrudan çalışabilir; bazı Linux/VPS ortamlarında Chromium bağımlılıkları veya `executablePath` ayarı gerekebilir.

PDF akışı:

- Kullanıcı rapor oluşturur
- Rapor HTML olarak hazırlanır
- Puppeteer PDF üretir
- PDF dosyası indirilebilir hale gelir

---

## GitHub'a Eklenmemesi Gerekenler

Aşağıdaki klasör ve dosyalar kaynak kod değildir:

```text
node_modules/
.next/
.next-build/
.next-devrun/
.next-smoke/
.next-visual/
tsconfig.tsbuildinfo
.env.local
```

GitHub'a eklenmesi gereken temel dosyalar:

```text
app/
components/
lib/
prisma/schema.prisma
public/
image/
types/
package.json
package-lock.json
README.md
.env.local
```

---

## Lisans

Bu proje kişisel finans yönetimi ve AI destekli analiz deneyimi için geliştirilmiştir. Lisans bilgisini production yayını öncesinde proje sahibinin kullanım amacına göre netleştirmesi önerilir.
