# FinWise AI — Tam Sistem Geliştirme Promptu
> **Akıllı Kişisel Finans Koçu** · Production-Ready Full-Stack Web Uygulaması  
> Finans Temalı Üretken Yapay Zekâ Hackathon Projesi

---

## ⚠️ Geliştirici Manifestosu

Bu prompt bir MVP taslağı değildir. Aşağıdaki rollerin tamamını üstlenerek hareket et:

- **Senior Full-Stack Architect** — Sistem bütünlüğü ve mimari kararlar
- **Senior Backend Engineer** — API tasarımı, güvenlik, veritabanı
- **Senior Frontend Engineer** — Bileşen mimarisi, performans, erişilebilirlik
- **Product Designer** — UX akışları, tipografi, görsel tutarlılık
- **AI Engineer** — Agent mimarisi, prompt mühendisliği, output şemaları
- **Database Architect** — Schema tasarımı, indexleme, ilişkiler, cascade davranışları
- **QA Engineer** — Tip güvenliği, validasyon, hata yönetimi, edge case'ler

**Çalışma İlkeleri:**

- Kod yaz, taslak çizme. Her satır çalışır olmalı.
- `// TODO`, `// mock`, `// placeholder` gibi geçici ifadeler kullanma.
- TypeScript strict modda çalış. `any` tipi yasaktır.
- Kullanılmayan import, değişken veya fonksiyon bırakma.
- Her API endpoint'i auth kontrolü, Zod validasyonu ve try/catch içermeli.
- AI asla boş yanıt döndürmemeli, asla sayı uydurmammalı.
- Finansal hesaplamalar deterministik backend motorunda yapılır; AI yalnızca yorumlar.

---

## 📌 Proje Tanımı

**FinWise AI**, kullanıcının gelir, gider, borç, abonelik ve tasarruf hedeflerini analiz eden; kişiye özel bütçe planı, harcama yorumu, finansal sağlık skoru, borç farkındalığı, haftalık aksiyon planı ve AI destekli finans raporları sunan tam çalışan bir kişisel finans web uygulamasıdır.

### Kapsam Sınırları (Yasal Zorunluluk)

Bu uygulama **yatırım tavsiyesi vermez.** Hisse senedi, kripto para, al-sat sinyali, portföy yönetimi veya herhangi bir finansal enstrüman tavsiyesi içermez.

Kapsam yalnızca şunlardır: kişisel bütçe yönetimi, gelir-gider analizi, tasarruf hedefleri, borç farkındalığı ve finansal okuryazarlık.

> **Zorunlu Disclaimer:** Tüm AI çıktılarında ve uygun UI konumlarında şu metin gösterilmelidir:
> *"Bu bilgiler yalnızca genel bilgilendirme amaçlıdır; kişisel finansal yatırım tavsiyesi niteliği taşımaz."*

---

## 1. Teknoloji Stack

### 1.1 Frontend

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| Next.js App Router | 14+ | Temel framework, SSR/SSG, routing |
| React | 18+ | UI bileşen katmanı |
| TypeScript | 5+ | Tip güvenliği, strict mod |
| Tailwind CSS | 3+ | Utility-first stil sistemi |
| shadcn/ui | latest | Erişilebilir, özelleştirilebilir bileşenler |
| Recharts | latest | Finansal grafikler ve veri görselleştirme |
| Framer Motion veya Motion.dev | latest | Sayfa geçişleri, micro-interaction animasyonları |
| React Hook Form | latest | Performanslı form yönetimi |
| Zod | latest | İstemci tarafı şema validasyonu |
| Sonner | latest | Toast bildirim sistemi |

### 1.2 Backend

| Teknoloji | Versiyon | Kullanım Amacı |
|---|---|---|
| Next.js Route Handlers | 14+ | Sunucu tarafı API katmanı |
| TypeScript | 5+ | Strict tip güvenliği |
| Prisma ORM | latest | Tip-güvenli veritabanı erişimi |
| PostgreSQL | 15+ | İlişkisel veritabanı |
| Auth.js (NextAuth v5) | latest | Oturum yönetimi, JWT, OAuth altyapısı |
| bcrypt | latest | Parola hash'leme (min 12 salt round) |
| Zod | latest | Sunucu tarafı input validasyonu |

### 1.3 AI Katmanı

| Dosya | Sorumluluk |
|---|---|
| `lib/ai/provider.ts` | Gemini API soyutlama katmanı. Provider değiştirilebilir olmalı. |
| `lib/ai/prompts.ts` | Tüm system prompt'lar tek dosyada, dışa aktarılmış sabitler olarak. |
| `lib/ai/agents.ts` | 9 ayrı agent'ın implementasyonu. |
| `lib/ai/orchestrator.ts` | Kullanıcı mesajını analiz eder, doğru agent'ı seçer, zincirler. |
| `lib/ai/schemas.ts` | AI çıktıları için Zod şemaları. Tüm AI yanıtları bu şemalarla parse edilir. |

> **Kritik Kural:** AI provider olarak **Gemini API** kullanılacak. Ancak kod `provider.ts` üzerinden soyutlanacak; ileride OpenAI veya başka bir provider'a geçiş için yalnızca bu dosyanın değiştirilmesi yeterli olmalı.

### 1.4 Finansal Hesaplama Motoru

```
lib/finance/calculations.ts
```

- Tüm sayısal hesaplamalar bu dosyada deterministik olarak yapılır.
- AI bu fonksiyonların **çıktılarını yorumlar**; hesaplama yapmaz.
- Fonksiyonlar saf (pure) olmalı, yan etkisiz, birim test edilebilir.

### 1.5 PDF Rapor

- Sunucu tarafında üretilir (`@react-pdf/renderer` veya `pdfkit`).
- Kullanıcı `/api/reports/[id]/pdf` endpoint'inden indirir.
- PDF sade, profesyonel ve yazdırılabilir formatta olmalı.

### 1.6 Deployment ve Yapılandırma

- `.env.local` — tüm ortam değişkenleri açıklamalı şekilde
- `README.md` — kurulum, çalıştırma, seed, demo kullanıcı bilgileri
- `prisma/schema.prisma` — tam ilişkisel schema
- Build-ready yapı: `next build` hatasız tamamlanmalı

---

## 2. Modüller

Aşağıdaki 20 modülün tamamı tam çalışır halde teslim edilecek:

| # | Modül | Açıklama |
|---|---|---|
| 1 | Authentication | Kayıt, giriş, şifre sıfırlama, oturum yönetimi |
| 2 | User Onboarding | 6 adımlı ilk kurulum sihirbazı |
| 3 | Dashboard | Gerçek veriden beslenen özet görünüm |
| 4 | AI Finans Asistanı | Çok turlu, agentic chat arayüzü |
| 5 | Gelir Yönetimi | CRUD + tekrarlayan gelir |
| 6 | Gider Yönetimi | CRUD + kategori + ödeme yöntemi |
| 7 | İşlem Geçmişi | Birleşik liste, filtre, arama, tarih aralığı |
| 8 | Harcama Analizi | Grafik, trend, karşılaştırma, AI yorum |
| 9 | Bütçe Planlayıcı | Manuel veya AI ile aylık bütçe oluşturma |
| 10 | Tasarruf Hedefleri | Hedef ekleme, ilerleme, AI analiz |
| 11 | Borç Yönetimi | Borç ekleme, faiz analizi, önceliklendirme |
| 12 | Abonelik Takibi | Abonelik listesi, toplam maliyet, AI israf analizi |
| 13 | Finansal Sağlık Skoru | 0-100 skor, bileşen detayları, trend |
| 14 | Haftalık Aksiyon Planı | AI tarafından üretilen görev listesi |
| 15 | AI Finans Raporları | Haftalık/aylık AI raporu |
| 16 | PDF Rapor İndirme | Sunucu tarafı PDF üretimi ve indirme |
| 17 | Bildirim Merkezi | Sistem ve AI bildirimleri |
| 18 | Admin Panel | Kullanıcı, sistem ve AI yönetimi |
| 19 | AI Log Denetimi | Admin için AI konuşma ve analiz logları |
| 20 | Sistem Analitiği | Admin için kullanıcı ve platform istatistikleri |

---

## 3. Route Yapısı

### Public Routes

```
/                          → Landing page
/auth/login                → Giriş
/auth/register             → Kayıt
/auth/forgot-password      → Şifre sıfırlama
```

### App Routes (Auth Gerekli)

```
/app                       → Dashboard (ana sayfa)
/app/onboarding            → İlk kurulum sihirbazı
/app/assistant             → AI finans asistanı
/app/income                → Gelir yönetimi
/app/expenses              → Gider yönetimi
/app/transactions          → Tüm işlem geçmişi
/app/analytics             → Harcama analizi ve grafikler
/app/budget                → Bütçe planlayıcı
/app/goals                 → Tasarruf hedefleri listesi
/app/goals/[id]            → Hedef detayı ve AI analizi
/app/debts                 → Borç yönetimi
/app/subscriptions         → Abonelik takibi
/app/health-score          → Finansal sağlık skoru
/app/action-plan           → Haftalık aksiyon planı
/app/reports               → Raporlar listesi
/app/reports/[id]          → Rapor detayı
/app/settings              → Kullanıcı ayarları
```

### Admin Routes (ADMIN Rolü Gerekli)

```
/admin                     → Admin dashboard
/admin/users               → Kullanıcı yönetimi
/admin/categories          → Kategori yönetimi
/admin/ai-logs             → AI log denetimi
/admin/reports             → Platform raporları
/admin/analytics           → Sistem analitiği
/admin/settings            → Sistem ayarları
```

> **Kural:** Her route, sunucu tarafında auth ve rol kontrolü yapar. Yalnızca frontend guard yeterli değildir.

---

## 4. Güvenlik ve Yetkilendirme

### Roller

| Rol | Açıklama |
|---|---|
| `USER` | Standart kullanıcı. Yalnızca kendi verilerine erişir. |
| `ADMIN` | Platform yöneticisi. Kullanıcı verisini göremez, yalnızca istatistik ve logları yönetir. |

### USER İzinleri

- Kendi finans verilerini görüntüler, oluşturur, düzenler ve siler.
- AI asistana soru sorar.
- Hedef, borç, abonelik, gelir ve gider yönetir.
- Rapor oluşturur ve PDF indirir.
- Başka kullanıcının hiçbir verisine erişemez.

### ADMIN İzinleri

- Kullanıcı listesini görür; kullanıcı profilini düzenleyebilir, hesabı devre dışı bırakabilir.
- Sistem genelinde istatistikleri görür.
- AI loglarını (AIConversation, AIMessage, AIAnalysis) inceler.
- Varsayılan kategorileri yönetir.
- Platform raporlarını ve genel analitiği görür.

### Zorunlu Güvenlik Kuralları

1. **Sunucu tarafı auth kontrolü:** Her API route handler'ı `getSession()` ile oturumu doğrular. Oturum yoksa `401 UNAUTHORIZED` döner.
2. **Kaynak sahipliği kontrolü:** Her kayıt sorgusu `where: { id, userId: session.user.id }` koşulunu içerir. Başkasının kaydına erişim girişiminde `404 NOT_FOUND` döner (404 tercih edilir; 403, kaydın varlığını açığa çıkarır).
3. **Role-based erişim:** Admin route'ları `session.user.role === 'ADMIN'` kontrolü yapar. Yetersiz rol: `403 FORBIDDEN`.
4. **Input validasyonu:** Tüm POST/PATCH body'leri Zod ile parse edilir. Hata durumunda `400 VALIDATION_ERROR` döner.
5. **Parola güvenliği:** bcrypt ile minimum 12 salt round. Parola asla response'a dahil edilmez.
6. **Hata mesajları:** Production'da stack trace veya iç sistem bilgisi sızdırılmaz.

---

## 5. Veritabanı Tasarımı

### 5.1 Prisma Schema Modelleri

```prisma
model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(USER)
  currency     String   @default("TRY")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  profile       UserProfile?
  incomes       Income[]
  expenses      Expense[]
  transactions  Transaction[]
  budgets       Budget[]
  goals         Goal[]
  debts         Debt[]
  subscriptions Subscription[]
  healthScores  FinancialHealthScore[]
  conversations AIConversation[]
  analyses      AIAnalysis[]
  actionPlans   ActionPlan[]
  reports       Report[]
  notifications Notification[]

  @@index([email])
}

enum Role { USER ADMIN }
```

> Diğer tüm modeller benzer şekilde tam alanlar, ilişkiler, `@@index` direktifleri ve `onDelete: Cascade` ile tanımlanacak.

### 5.2 Tüm Modeller

| Model | Kritik Alanlar | Notlar |
|---|---|---|
| `UserProfile` | city, occupation, incomeFrequency, financialGoalType, riskTolerance, hasDebt, onboardingCompleted | User ile 1-1 |
| `Income` | title, amount, category, frequency (MONTHLY/WEEKLY/YEARLY/ONE_TIME), date, note | Tekrarlayan gelir desteği |
| `Expense` | title, amount, categoryId, paymentMethod (CASH/CARD/TRANSFER), isRecurring, date, note | Category FK |
| `Transaction` | type (INCOME/EXPENSE), title, amount, categoryId, date, source, note | Birleşik görünüm |
| `Category` | name, type (INCOME/EXPENSE), icon, color, isDefault | Admin yönetir |
| `Budget` | month, year, totalIncome, plannedExpense, plannedSaving | BudgetCategory ile 1-N |
| `BudgetCategory` | budgetId, categoryId, plannedAmount, actualAmount | Bütçe-kategori eşleştirme |
| `Goal` | title, targetAmount, currentAmount, deadline, priority (HIGH/MEDIUM/LOW), status (ACTIVE/COMPLETED/PAUSED) | — |
| `Debt` | title, totalAmount, remainingAmount, minimumPayment, interestRate, dueDay, type (CREDIT_CARD/LOAN/MORTGAGE/OTHER), status | — |
| `Subscription` | title, amount, billingCycle (MONTHLY/YEARLY), nextBillingDate, category, status (ACTIVE/CANCELLED/PAUSED) | — |
| `FinancialHealthScore` | score (0-100), incomeExpenseRatio, savingRate, debtLoad, emergencyFundScore, spendingDiscipline, explanation | Her hesaplamada yeni kayıt |
| `AIConversation` | title, userId | AIMessage ile 1-N |
| `AIMessage` | conversationId, role (USER/ASSISTANT), content, metadataJson | — |
| `AIAnalysis` | userId, type, inputJson, outputJson, score | Agent tipi ve çıktısı loglanır |
| `ActionPlan` | title, weekStart, weekEnd, summary, status | ActionItem ile 1-N |
| `ActionItem` | actionPlanId, title, description, category, priority, status, dueDate | — |
| `Report` | title, type (WEEKLY/MONTHLY), periodStart, periodEnd, summary, contentJson, pdfUrl | — |
| `Notification` | title, message, type, isRead | — |
| `AdminAuditLog` | adminId, action, targetType, targetId, metadataJson | Admin eylemleri loglanır |

### 5.3 İndeksleme Kuralları

- Tüm foreign key alanları `@@index` ile indekslenecek.
- `email` alanı `@unique` ve indeksli.
- `createdAt` alanları sıralama için indekslenecek.
- `userId + month + year` gibi bileşik sorgular için composite index eklenecek.

---

## 6. API Endpointleri

### Standart Response Şeması

Her endpoint aşağıdaki tip yapısına uygun yanıt döner:

```typescript
type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
};

type ApiError = {
  success: false;
  error: {
    code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "INTERNAL_ERROR" | string;
    message: string;
    details?: unknown; // Yalnızca geliştirme ortamında
  };
};

type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

### 6.1 Auth & User

```
POST   /api/auth/register          → Yeni kullanıcı kaydı
GET    /api/auth/session           → Aktif oturum bilgisi
GET    /api/user/me                → Giriş yapan kullanıcının profili
PATCH  /api/user/profile           → Profil güncelleme
PATCH  /api/user/change-password   → Parola değiştirme
```

### 6.2 Finansal CRUD

```
GET    /api/income                 → Gelir listesi (filtre: month, year, category)
POST   /api/income                 → Gelir ekle
PATCH  /api/income/[id]            → Gelir güncelle
DELETE /api/income/[id]            → Gelir sil

GET    /api/expenses               → Gider listesi (filtre: month, year, categoryId)
POST   /api/expenses               → Gider ekle
PATCH  /api/expenses/[id]          → Gider güncelle
DELETE /api/expenses/[id]          → Gider sil

GET    /api/transactions           → Birleşik işlem listesi (arama, filtre, sayfalama)
POST   /api/transactions           → İşlem ekle
PATCH  /api/transactions/[id]      → İşlem güncelle
DELETE /api/transactions/[id]      → İşlem sil

GET    /api/categories             → Kategori listesi
POST   /api/categories             → Kategori ekle (kullanıcı özel)
PATCH  /api/categories/[id]        → Kategori güncelle
DELETE /api/categories/[id]        → Kategori sil

GET    /api/budget                 → Bütçe listesi (filtre: month, year)
POST   /api/budget/generate        → AI ile bütçe üret
PATCH  /api/budget/[id]            → Bütçe güncelle

GET    /api/goals                  → Hedef listesi
POST   /api/goals                  → Hedef ekle
GET    /api/goals/[id]             → Hedef detayı
PATCH  /api/goals/[id]             → Hedef güncelle
DELETE /api/goals/[id]             → Hedef sil
POST   /api/goals/[id]/simulate    → Hedef fizibilite simülasyonu

GET    /api/debts                  → Borç listesi
POST   /api/debts                  → Borç ekle
PATCH  /api/debts/[id]             → Borç güncelle
DELETE /api/debts/[id]             → Borç sil
POST   /api/debts/analyze          → AI borç risk analizi

GET    /api/subscriptions          → Abonelik listesi
POST   /api/subscriptions          → Abonelik ekle
PATCH  /api/subscriptions/[id]     → Abonelik güncelle
DELETE /api/subscriptions/[id]     → Abonelik sil
POST   /api/subscriptions/analyze-waste → AI israf analizi
```

### 6.3 Analitik

```
GET    /api/analytics/overview              → Dashboard özet verileri
GET    /api/analytics/spending-by-category  → Kategoriye göre harcama dağılımı
GET    /api/analytics/monthly-trend         → Aylık gelir/gider trendi (son 12 ay)
GET    /api/analytics/health-score          → Finansal sağlık skoru geçmişi
```

### 6.4 AI Endpointleri

```
POST   /api/ai/chat                → Genel asistan konuşması (orchestrator)
POST   /api/ai/analyze-spending    → SpendingAnalysisAgent
POST   /api/ai/generate-budget     → BudgetPlannerAgent
POST   /api/ai/goal-plan           → GoalPlannerAgent
POST   /api/ai/debt-risk           → DebtRiskAgent
POST   /api/ai/action-plan         → ActionPlanAgent
POST   /api/ai/report              → ReportAgent
```

### 6.5 Raporlar

```
GET    /api/reports                → Rapor listesi
POST   /api/reports/generate       → Rapor üret (haftalık/aylık)
GET    /api/reports/[id]           → Rapor detayı (JSON)
GET    /api/reports/[id]/pdf       → PDF rapor indir
```

### 6.6 Admin (ADMIN Rolü Gerekli)

```
GET    /api/admin/overview         → Platform özet istatistikleri
GET    /api/admin/users            → Kullanıcı listesi (sayfalama, arama)
PATCH  /api/admin/users/[id]       → Kullanıcı durumu güncelle
GET    /api/admin/categories       → Tüm kategoriler
POST   /api/admin/categories       → Varsayılan kategori ekle
PATCH  /api/admin/categories/[id]  → Kategori düzenle
DELETE /api/admin/categories/[id]  → Kategori sil
GET    /api/admin/ai-logs          → AI analiz logları (filtreli)
GET    /api/admin/reports          → Platform rapor listesi
GET    /api/admin/analytics        → Kullanım analitiği
```

---

## 7. Finansal Hesaplama Motoru

**Dosya:** `lib/finance/calculations.ts`

Tüm fonksiyonlar saf (pure) olacak. Yan etki içermeyecek. Input-output tipleri Zod şemasıyla korunacak.

```typescript
// Temel hesaplamalar
calculateMonthlyIncome(incomes: Income[]): number
calculateMonthlyExpenses(expenses: Expense[]): number
calculateNetCashflow(monthlyIncome: number, monthlyExpenses: number): number
calculateSavingRate(netCashflow: number, monthlyIncome: number): number
calculateDebtLoadRatio(totalMonthlyDebtPayments: number, monthlyIncome: number): number

// Bütçe hesaplamaları
calculateBudgetDistribution(monthlyIncome: number): BudgetDistribution
// → { needs: number, wants: number, savings: number } (50/30/20 kuralı + kişiselleştirme)
generateCategoryLimits(expenses: Expense[], budget: Budget): CategoryLimit[]

// Hedef hesaplamaları
calculateGoalFeasibility(goal: Goal, netCashflow: number): GoalFeasibility
// → { isFeasible: boolean, requiredMonthly: number, estimatedCompletionDate: Date, shortfall?: number }
calculateRequiredMonthlySaving(targetAmount: number, currentAmount: number, deadlineMonths: number): number

// Finansal sağlık skoru (0-100, deterministik)
calculateFinancialHealthScore(input: HealthScoreInput): HealthScoreResult
// Alt puanlar:
//   incomeExpenseBalance  : max 25 puan
//   savingRate            : max 20 puan
//   debtLoad              : max 20 puan
//   spendingDiscipline    : max 20 puan
//   goalProgress          : max 15 puan

// Analitik fonksiyonlar
detectOverspendingCategories(expenses: Expense[], limits: CategoryLimit[]): OverspendingAlert[]
detectSubscriptionWaste(subscriptions: Subscription[]): SubscriptionWasteResult
estimateDebtPayoffTime(debt: Debt, extraMonthlyPayment?: number): PayoffEstimate
compareCurrentMonthToPreviousMonth(current: MonthData, previous: MonthData): MonthComparison
```

### Finansal Sağlık Skoru Kriterleri

| Bileşen | Puan | Kriter |
|---|---|---|
| Gelir-Gider Dengesi | 0-25 | Giderler gelirin %70'inden azsa tam puan |
| Tasarruf Oranı | 0-20 | %20+ tasarruf tam puan, %0 sıfır puan |
| Borç Yükü | 0-20 | Gelirin %15'inden az borç ödemesi tam puan |
| Harcama Disiplini | 0-20 | Bütçe limitlerini aşmama oranı |
| Hedef İlerlemesi | 0-15 | Aktif hedeflerdeki ortalama ilerleme yüzdesi |

| Skor Aralığı | Durum | Renk |
|---|---|---|
| 80-100 | Güçlü | Yeşil |
| 60-79 | İyi, geliştirilebilir | Mavi |
| 40-59 | Dikkat gerekiyor | Sarı |
| 0-39 | Riskli | Kırmızı |

---

## 8. AI Agent Mimarisi

### Temel İlke

AI asla sayı uydurmaz. Orchestrator önce `lib/finance/calculations.ts` fonksiyonlarını çalıştırır, hesaplanmış verileri ve kullanıcı bağlamını agent'a iletir. Agent yalnızca bu verileri yorumlar, bağlam kurar ve öneriler üretir.

### 8.1 Agent Listesi

| Agent | Sorumluluk |
|---|---|
| `SpendingAnalysisAgent` | Harcamaları analiz eder. Kategori bazlı fazla harcama tespit eder. Önceki ay ile karşılaştırır. |
| `BudgetPlannerAgent` | Kişiye özel aylık bütçe planı çıkarır. 50/30/20 veya kişiselleştirilmiş kategori limitleri önerir. |
| `GoalPlannerAgent` | Hedefin gerçekçi olup olmadığını hesaplanmış verilerle analiz eder. Alternatif süre senaryoları sunar. |
| `DebtRiskAgent` | Borç yükü oranını yorumlar. Minimum ödeme riskini açıklar. Öncelikli borç kapatma stratejisi önerir (çığ/kartopu yöntemi). |
| `SubscriptionWasteAgent` | Abonelikleri analiz eder. Uzun süredir kullanılmayan veya pahalı olanları tespit eder. |
| `FinancialHealthAgent` | Skor bileşenlerini açıklar. Risk faktörlerini ve güçlü alanları listeler. İyileştirme yol haritası sunar. |
| `ActionPlanAgent` | Bu haftaya özel, uygulanabilir, önceliklendirilmiş görev listesi oluşturur. |
| `ReportAgent` | Haftalık veya aylık kapsamlı finans raporu üretir. PDF içeriğini de yapılandırır. |
| `ExplanationAgent` | "Bileşik faiz nedir?", "DTI oranı ne demek?" gibi soruları sade Türkçe ile yanıtlar. |

### 8.2 Orchestrator Akışı

```
Kullanıcı mesajı gelir
    ↓
Intent analizi yapılır (hangi agent gerekiyor?)
    ↓
Kullanıcıya ait finansal veriler DB'den çekilir
    ↓
calculations.ts ile deterministik hesaplamalar yapılır
    ↓
İlgili agent(lar) sırayla çağrılır
    ↓
Çıktı AIAnalysis şemasıyla parse edilir (Zod)
    ↓
Parse başarısızsa → fallback yanıt
    ↓
AIConversation, AIMessage, AIAnalysis tablolarına log yazılır
    ↓
Yapılandırılmış yanıt kullanıcıya döner
```

### 8.3 Standart AI Çıktı Şeması

```typescript
const AIResponseSchema = z.object({
  summary: z.string().min(1),
  diagnosis: z.object({
    status: z.enum(["good", "warning", "risk"]),
    mainIssue: z.string(),
    explanation: z.string(),
  }),
  insights: z.array(z.object({
    title: z.string(),
    description: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })).min(1),
  recommendations: z.array(z.object({
    title: z.string(),
    action: z.string(),
    estimatedImpact: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
  })).min(1),
  numbers: z.object({
    monthlyIncome: z.number().optional(),
    monthlyExpense: z.number().optional(),
    estimatedSaving: z.number().optional(),
    requiredSavingForGoal: z.number().optional(),
    debtLoadRatio: z.number().optional(),
    financialHealthScore: z.number().optional(),
  }),
  actionItems: z.array(z.object({
    title: z.string(),
    description: z.string(),
    dueInDays: z.number().optional(),
    priority: z.enum(["low", "medium", "high"]),
  })),
  disclaimer: z.string().min(1),
});
```

> **Fallback Kuralı:** AI yanıtı bu şemayla parse edilemezse sistem hata fırlatmaz. Kullanıcıya önceden hazırlanmış anlamlı bir fallback yanıt gösterilir ve hata AIAnalysis tablosuna loglanır.

---

## 9. Frontend Tasarım Sistemi

### 9.1 Tasarım Dili

Modern, güvenilir, premium, finans odaklı SaaS dashboard kalitesi.

- Flat, beyaz yüzeyler. Gradient, gürültü dokusu veya dekoratif efekt yok.
- Soft shadow sadece yükselen kart bileşenlerinde.
- Rounded corner, ince border, okunabilir tipografi.
- Mobile-first, fully responsive (320px'den itibaren).
- WCAG 2.1 AA erişilebilirlik standardı.

### 9.2 Renk Sistemi

```css
:root {
  --background:   #F8FAFC;  /* Sayfa arka planı */
  --surface:      #FFFFFF;  /* Kart yüzeyi */
  --primary:      #0F172A;  /* Başlık, önemli metin */
  --accent:       #10B981;  /* CTA, başarı, aktif durum */
  --accent-dark:  #059669;  /* Hover state */
  --warning:      #F59E0B;  /* Uyarı durumu */
  --danger:       #EF4444;  /* Hata, riskli durum */
  --muted:        #64748B;  /* İkincil metin */
  --border:       #E2E8F0;  /* Sınır rengi */
  --border-light: #F1F5F9;  /* Hafif sınır */
}
```

### 9.3 Tipografi

```css
/* Başlık hiyerarşisi */
h1: 28px / weight 600 / primary
h2: 22px / weight 600 / primary
h3: 18px / weight 500 / primary
h4: 15px / weight 500 / primary

/* Gövde */
body: 14px / weight 400 / line-height 1.7 / muted
label: 12px / weight 500 / uppercase / letter-spacing 0.05em / muted
code: font-mono / 13px / surface arka plan
```

### 9.4 Bileşen Kütüphanesi

Aşağıdaki bileşenlerin tamamı oluşturulacak ve tutarlı biçimde kullanılacak:

- **StatCard** — ikon, başlık, değer, trend yüzdesi, renk durumu
- **DataTable** — sayfalama, arama, sıralama, seçim, bulk action
- **ChartCard** — başlık, dönem seçici, Recharts sarmalayıcı
- **ProgressBar** — label, değer, hedef, renk durumu
- **Badge** — success / warning / danger / muted renk varyantları
- **EmptyState** — ikon, başlık, açıklama, CTA butonu
- **LoadingSkeleton** — her sayfa için özelleştirilmiş iskelet
- **ErrorState** — hata mesajı, yeniden deneme butonu
- **ConfirmModal** — silme ve kritik işlemler için onay diyalogu
- **Drawer** — mobilde tam ekran, masaüstünde sağ panel
- **FormField** — label, input, hata mesajı, yardım metni
- **AIResponseCard** — summary, diagnosis, insights, recommendations, numbers, actionItems bölümleri

### 9.5 Layout Shell'leri

**App Shell (`/app` layout):**
- Sol: Collapsible sidebar (masaüstü) / bottom nav (mobil)
- Üst: Topbar — breadcrumb, bildirim ikonu, kullanıcı menüsü
- Ana içerik: Sağ taraf, scrollable

**Admin Shell (`/admin` layout):**
- Benzer yapı, farklı navigasyon öğeleri ve renk tonu

---

## 10. Sayfa Spesifikasyonları

### 10.1 Landing Page (`/`)

**Bölümler (yukarıdan aşağıya):**

1. **Header** — Logo, navigasyon linkleri, Giriş Yap / Ücretsiz Başla butonları
2. **Hero** — Ana başlık, alt metin, ikili CTA, ürün ekran görüntüsü mockup'ı
3. **Problem Bölümü** — "Paranın nereye gittiğini biliyor musun?" — 3 somut problem kartı
4. **Çözüm Bölümü** — FinWise AI'ın bu problemlere verdiği yanıtlar
5. **Özellikler** — 6 özellik kartı, ikon, başlık, açıklama
6. **Agentic AI Bölümü** — 9 agent, her birinin ne yaptığı ve değeri
7. **Nasıl Çalışır** — 4 adımlı görsel süreç (Bağlan → Analiz → Plan → Takip)
8. **Kullanım Senaryoları** — "Bu ay neden fazla harcadım?", "Kredi kartı borcumu nasıl azaltırım?" gibi gerçekçi soru-cevap örnekleri
9. **Dashboard Önizlemesi** — Gerçekçi dashboard ekran görüntüsü
10. **Güvenlik Bölümü** — Veri gizliliği, şifreleme, yatırım tavsiyesi vermeme uyarısı
11. **Son CTA** — "Ücretsiz Başla" — büyük, net
12. **Footer** — Logo, bağlantılar, yasal uyarı

**Hero Metinleri:**
```
Başlık:    "Paranı nereye harcadığını anlayan akıllı finans koçu."
Alt metin: "FinWise AI gelir, gider, borç ve hedeflerini analiz ederek
            sana kişisel bütçe planı, tasarruf önerileri ve haftalık
            aksiyon listesi sunar."
CTA 1:     "Ücretsiz Başla"
CTA 2:     "Demo Dashboard'u Gör"
```

---

### 10.2 Auth Sayfaları

**Giriş (`/auth/login`):**
- Email, parola alanları
- "Beni hatırla" checkbox
- "Parolamı unuttum" linki
- Giriş Yap butonu
- Kayıt ol yönlendirme linki
- Demo kullanıcı ile hızlı giriş butonu (hackathon demosu için)

**Kayıt (`/auth/register`):**
- Ad soyad, email, parola, parola tekrar alanları
- Şifre gücü göstergesi
- Kullanım koşullarını kabul checkbox'ı
- Kayıt Ol butonu
- Giriş sayfasına yönlendirme

**Şifre Sıfırlama (`/auth/forgot-password`):**
- Email alanı
- "Sıfırlama bağlantısı gönder" butonu
- Giriş sayfasına dönüş linki

---

### 10.3 Onboarding (`/app/onboarding`)

Onboarding tamamlanmadan `/app` dashboard'una erişilemez. Middleware ile kontrol edilir.

**Adımlar:**

| Adım | İçerik |
|---|---|
| 1 / 6 | Aylık net geliriniz ne kadar? (tutar + para birimi seçimi) |
| 2 / 6 | Başlıca aylık giderleriniz neler? (kira, faturalar, market, ulaşım — çoklu seçim + tutar) |
| 3 / 6 | Aktif bir borçunuz var mı? (kredi kartı, tüketici kredisi, mortgage — evet/hayır + tür seçimi) |
| 4 / 6 | Ana finansal hedefiniz nedir? (acil fon, ev, araba, emeklilik, borç kapatma — tek seçim) |
| 5 / 6 | Risk toleransınız nasıl? (açıklayıcı metinlerle 3 seçenek: temkinli / dengeli / agresif) |
| 6 / 6 | Bildirim tercihleriniz (haftalık özet, limit uyarıları, aksiyon planı hatırlatıcısı) |

- İlerleme barı her adımda güncellenir.
- Geri butonu ile önceki adıma dönülebilir.
- "Şimdi atla" seçeneği son adımda sunulabilir.
- Tamamlandığında `UserProfile.onboardingCompleted = true` ve dashboard'a yönlendirme.

---

### 10.4 Dashboard (`/app`)

**Üst Satır — Stat Kartları:**
- Aylık Gelir (₺ değer, geçen aya göre % değişim)
- Aylık Gider (₺ değer, geçen aya göre % değişim)
- Kalan Para / Net Nakit Akışı
- Tasarruf Oranı (% değer, hedefe göre ilerleme)

**Orta Satır:**
- Finansal Sağlık Skoru (büyük sayı + durum badge + kısa açıklama)
- En Yüksek Harcama Kategorisi
- Aktif Hedef İlerlemesi (en yakın hedef)
- Borç Durumu Özeti

**AI Özet Kartı:**
- Bu haftaki AI tespiti (otomatik üretilmiş)
- "Detaylı Analiz" butonu → `/app/assistant`

**Grafikler:**
- Aylık gelir/gider trend çizgi grafiği (son 6 ay)
- Kategori bazlı harcama pasta grafiği (bu ay)

**Alt Bölümler:**
- Yaklaşan Ödemeler (borçlar + abonelik yenilemeleri, 7 gün)
- Haftalık Aksiyon Listesi (tamamlama checkbox'larıyla)
- Son 5 İşlem

---

### 10.5 AI Asistan (`/app/assistant`)

**Layout:** İki kolonlu (masaüstü) / tek kolon sekmeli (mobil)

**Sol Panel — Chat:**
- Konuşma geçmişi (mevcut oturum)
- Mesaj input alanı (multiline, Enter gönder, Shift+Enter yeni satır)
- Örnek soru chip'leri (ilk açılışta):
  - "Bu ay neden fazla harcadım?"
  - "3 ayda 20.000 TL biriktirebilir miyim?"
  - "Kredi kartı borcumu nasıl önceliklendirmeliyim?"
  - "Market harcamam normal mi?"
  - "Finansal sağlık skorumu nasıl artırırım?"
- Gönderme sırasında loading animasyonu

**Sağ Panel — Yapılandırılmış AI Yanıtı:**
- **Özet** kartı (diagnosis status badge + açıklama)
- **İçgörüler** listesi (severity badge + açıklama)
- **Öneriler** listesi (zorluk badge + tahmini etki)
- **Sayılar** kartı (hesaplanmış finansal metrikler)
- **Aksiyon Maddeleri** (öncelik + kaç güne kadar)
- **Disclaimer** metni (küçük, muted)

---

### 10.6 Gelir Yönetimi (`/app/income`)

- Gelir listesi (tablo: başlık, kategori, tutar, sıklık, tarih, işlemler)
- Aylık toplam özet kartı
- Gelir ekle/düzenle — drawer formunda: başlık, tutar, kategori, sıklık (tekrarlayan), tarih, not
- Silme onay modalı
- Boş durum: "Henüz gelir eklemediniz" + CTA

---

### 10.7 Gider Yönetimi (`/app/expenses`)

- Gider listesi (tablo: başlık, kategori, ödeme yöntemi, tutar, tarih, tekrarlayan badge, işlemler)
- Bu ay toplam gider özet kartı
- Gider ekle/düzenle — drawer formunda: başlık, tutar, kategori seçici, ödeme yöntemi, tarih, tekrarlayan toggle, not
- Kategori bazlı hızlı filtre sekmeleri
- Boş durum bileşeni

---

### 10.8 İşlem Geçmişi (`/app/transactions`)

- Birleşik gelir + gider tablosu
- Tablo kolonları: Tarih, Başlık, Kategori, Tür, Tutar, Kaynak
- Arama (başlık, not)
- Filtreler: Tür (Gelir/Gider/Tümü), Kategori, Tarih Aralığı
- Sayfalama (25 kayıt / sayfa)
- CSV dışa aktarma butonu

---

### 10.9 Harcama Analizi (`/app/analytics`)

**Grafikler:**
- Aylık Trend — bar + çizgi kombine grafik (gelir vs gider, son 12 ay)
- Kategori Dağılımı — pasta grafik (bu ay)
- En Çok Harcanan Kategoriler — yatay bar grafik (top 5)
- Geçen Ay Karşılaştırması — renkli fark görünümü

**AI Yorum Kartı:**
- Bu ayki harcama örüntüsüne göre otomatik üretilmiş içgörü

**Dönem Seçici:**
- Bu ay, Geçen ay, Son 3 ay, Son 6 ay, Bu yıl, Özel aralık

---

### 10.10 Bütçe Planlayıcı (`/app/budget`)

- Ay/Yıl seçici
- "AI ile Bütçe Oluştur" butonu — BudgetPlannerAgent çağrısı
- Manuel bütçe oluşturma formu
- Kategori bazlı limitler tablosu (planlanan / gerçekleşen / fark / doluluk barı)
- Limit aşımı uyarısı (kırmızı satır + badge)
- Aylık bütçe özet kartları: Toplam Gelir, Planlanan Gider, Planlanan Tasarruf

---

### 10.11 Tasarruf Hedefleri (`/app/goals`)

- Hedef listesi — kart görünümü (başlık, hedef tutar, mevcut birikim, son tarih, ilerleme barı, durum badge)
- Hedef ekle formu: başlık, hedef tutarı, mevcut birikim, son tarih, öncelik
- Filtre: Aktif / Tamamlanan / Duraklatılan

**Hedef Detayı (`/app/goals/[id]`):**
- Hedef özet kartı
- Gerekli aylık birikim (hesaplanmış)
- Gerçekçilik analizi (AI yorumu + hesaplanmış veriler)
- Alternatif süre senaryoları (6 ay erken, 6 ay geç, mevcut)
- AI önerileri kartı
- "Bu Hedefe Para Ekle" butonu + miktar formu

---

### 10.12 Borç Yönetimi (`/app/debts`)

- Borç listesi (kart görünümü: başlık, tür, toplam/kalan tutar, minimum ödeme, faiz oranı, vade günü)
- Toplam borç özet kartı
- Borç ekle/düzenle formu: başlık, tür, toplam tutar, kalan tutar, minimum ödeme, faiz oranı, vade günü
- "AI Borç Analizi" butonu — DebtRiskAgent çağrısı
- AI çıktısı: borç yükü değerlendirmesi, öncelik sıralaması, önerilen strateji (çığ/kartopu)

---

### 10.13 Abonelik Takibi (`/app/subscriptions`)

- Abonelik listesi (logo placeholder, başlık, tutar, döngü, sonraki ödeme tarihi, durum badge)
- Aylık ve yıllık toplam maliyet özet kartları
- Abonelik ekle/düzenle formu: başlık, tutar, döngü (aylık/yıllık), sonraki ödeme tarihi, kategori
- "AI İsraf Analizi" butonu — SubscriptionWasteAgent çağrısı
- AI çıktısı: gereksiz olabilecek abonelikler, önerilen iptal adayları, potansiyel tasarruf

---

### 10.14 Finansal Sağlık Skoru (`/app/health-score`)

- Büyük skor göstergesi (0-100, renk kodlu daire)
- Durum badge'i (Güçlü / İyi / Dikkat / Riskli)
- 5 alt bileşen, her biri için progress bar + puan + kısa açıklama
- Güçlü Alanlar listesi
- İyileştirilmesi Gereken Alanlar listesi
- Geçmiş skor trend çizgi grafiği (son 6 hesaplama)
- "Skoru Hesapla / Güncelle" butonu
- AI açıklama kartı (FinancialHealthAgent)

---

### 10.15 Haftalık Aksiyon Planı (`/app/action-plan`)

- Bu haftanın aksiyon planı (AI tarafından üretilmiş)
- Görev listesi — her görev için: başlık, açıklama, kategori badge, öncelik badge, son tarih, tamamlandı checkbox
- İlerleme barı (tamamlanan / toplam görev)
- "Yeni Plan Oluştur" butonu (ActionPlanAgent çağrısı)
- Geçmiş hafta planları accordion listesi

---

### 10.16 Raporlar (`/app/reports`)

**Rapor Listesi:**
- Rapor kartları: başlık, tür (Haftalık/Aylık), dönem, oluşturulma tarihi
- "Haftalık Rapor Oluştur" ve "Aylık Rapor Oluştur" butonları (ReportAgent)
- Oluşturulurken loading state (bu işlem birkaç saniye sürebilir)

**Rapor Detayı (`/app/reports/[id]`):**
- Dönem özeti kartları
- AI içgörüleri ve öneriler
- Kategori harcama dağılımı
- Hedef ilerleme özeti
- PDF İndir butonu

---

### 10.17 Ayarlar (`/app/settings`)

- **Profil** — Ad, email (görüntüleme), şehir, meslek
- **Para Birimi** — TRY, USD, EUR, GBP
- **Bildirimler** — Haftalık özet, limit aşımı uyarıları, aksiyon planı hatırlatıcısı
- **Parola Değiştir** — Mevcut parola, yeni parola, tekrar
- **Hesap** — Hesabı devre dışı bırak (onay modalı)

---

### 10.18 Admin Dashboard (`/admin`)

**Özet Kartları:**
- Toplam Kullanıcı / Bu Ay Yeni Kullanıcı
- Aktif Kullanıcı (son 30 gün)
- Toplam İşlem Sayısı
- Toplam AI İstek Sayısı
- Oluşturulan Rapor Sayısı
- Ortalama Finansal Sağlık Skoru

**Grafikler:**
- Kullanıcı artış trendi (son 12 ay)
- AI kullanım trendi (günlük istek sayısı, son 30 gün)

---

### 10.19 Admin AI Logları (`/admin/ai-logs`)

- Filtreler: Agent türü, tarih aralığı, durum (başarılı/hatalı), kullanıcı
- Log listesi tablosu: Tarih, Kullanıcı, Agent, Durum, Süre (ms)
- Satıra tıklayınca sağ drawer açılır:
  - Input JSON (gönderilen veri)
  - Output JSON (AI çıktısı veya hata)
  - Kullanılan prompt özeti
  - Token kullanımı

---

### 10.20 Admin Kategoriler (`/admin/categories`)

- Varsayılan kategori listesi (ikon, renk, tür, ad)
- Kategori ekle/düzenle formu
- Kategori sil (kullanılan kategorilerde uyarı)

---

## 11. Seed Verisi

### Admin Kullanıcı

```
Email:    admin@finwise.ai
Şifre:    Admin12345!
Rol:      ADMIN
```

---

## 12. Validasyon Kuralları

### Genel Kurallar

```typescript
// Tüm tutar alanları
amount: z.number().positive("Tutar sıfırdan büyük olmalıdır")

// Email
email: z.string().email("Geçerli bir email adresi girin")

// Parola
password: z.string()
  .min(8, "En az 8 karakter")
  .regex(/[A-Z]/, "En az bir büyük harf")
  .regex(/[0-9]/, "En az bir rakam")

// Tarih
date: z.string().datetime() veya z.coerce.date()

// Pozitif sayı
positiveNumber: z.number().positive()

// Oran
rate: z.number().min(0).max(100)
```

### Model Bazlı Kurallar

| Alan | Kural |
|---|---|
| `Goal.targetAmount` | > 0 |
| `Goal.currentAmount` | >= 0, <= targetAmount |
| `Debt.remainingAmount` | >= 0, <= totalAmount |
| `Debt.interestRate` | >= 0 |
| `Debt.minimumPayment` | > 0 |
| `Subscription.amount` | > 0 |
| `Budget.plannedExpense` | < totalIncome (uyarı, zorunlu değil) |
| `UserProfile.riskTolerance` | enum: CONSERVATIVE / BALANCED / AGGRESSIVE |

### Hata Mesajı Standartları

- Kullanıcıya gösterilen mesajlar açık ve yönlendirici olacak.
- Teknik hata mesajları production'da sızdırılmayacak.
- Form hataları ilgili alanın altında gösterilecek.
- Genel hatalar toast ile bildirilecek.

---

## 13. PDF Rapor Yapısı

**Oluşturma:** Sunucu tarafı (`/api/reports/[id]/pdf`)  
**Format:** A4, dikey, sade tasarım  
**Font:** System font veya gömülü Türkçe destekli font

### Rapor Bölümleri

1. **Kapak** — FinWise AI logosu, rapor başlığı, dönem, oluşturulma tarihi
2. **Dönem Özeti** — Toplam gelir, toplam gider, net kalan, tasarruf oranı
3. **En Yüksek Harcama Kategorileri** — Top 5, tutar ve yüzde
4. **Finansal Sağlık Skoru** — Skor, bileşenler, durum açıklaması
5. **Borç Durumu** — Toplam kalan borç, aylık yük oranı
6. **Hedef İlerlemesi** — Aktif hedefler ve ilerleme yüzdesi
7. **AI Önerileri** — Bu dönemin en önemli 5 önerisi
8. **Haftalık Aksiyonlar** — Geçen haftanın tamamlanan ve tamamlanmayan görevleri
9. **Yasal Uyarı** — Yatırım tavsiyesi olmadığına dair zorunlu metin

---

## 14. Hata Yönetimi

### Backend

```typescript
// Her route handler bu yapıyla yazılacak
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Oturum açmanız gerekiyor." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = InputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Geçersiz veri.", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    // İş mantığı...
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[API_ERROR]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Bir hata oluştu. Lütfen tekrar deneyin." } },
      { status: 500 }
    );
  }
}
```

### Frontend

- API hatalarında `sonner` ile toast bildirimi
- Form submit sırasında button disabled + spinner
- Liste sorguları için loading skeleton
- Veri yoksa empty state bileşeni
- AI yanıtı gecikirse progress indicator

---

## 15. Kalite Kontrol Listesi

Proje teslim öncesinde aşağıdakilerin tamamı doğrulanacak:

### Fonksiyonellik

- [ ] Tüm public ve app route'ları erişilebilir durumda
- [ ] Auth akışı (kayıt → onboarding → dashboard) sorunsuz çalışıyor
- [ ] USER/ADMIN rol ayrımı doğru çalışıyor
- [ ] Tüm CRUD işlemleri (Income, Expense, Goal, Debt, Subscription) çalışıyor
- [ ] Dashboard gerçek veriden besleniyor
- [ ] Tüm Recharts grafikleri render oluyor
- [ ] AI asistan yanıt üretiyor, boş dönmüyor
- [ ] Finansal hesaplamalar backend'de yapılıyor
- [ ] PDF rapor indirilebiliyor
- [ ] Admin panel erişilebilir ve verilerle dolu

### Teknik Kalite

- [ ] `next build` hatasız tamamlanıyor
- [ ] TypeScript strict mod — sıfır `any` tipi
- [ ] Kullanılmayan import veya değişken yok
- [ ] Tüm API route'larında auth kontrolü mevcut
- [ ] Tüm API route'larında Zod validasyonu mevcut
- [ ] Tüm API route'larında try/catch mevcut
- [ ] `.env.local` tüm değişkenleri içeriyor
- [ ] README kurulum adımları eksiksiz

### UX Kalite

- [ ] Mobil responsive (320px+)
- [ ] Tüm formlar hata mesajlarını doğru gösteriyor
- [ ] Tüm loading state'ler mevcut
- [ ] Tüm empty state'ler mevcut
- [ ] Toast bildirimleri çalışıyor
- [ ] Disclaimer metni uygun yerlerde görünüyor

---

## 16. Ortam Değişkenleri

```env
# .env.local

# Veritabanı
DATABASE_URL="postgresql://user:password@localhost:5432/finwise_ai"

# Auth.js
NEXTAUTH_SECRET="your-secret-here-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider
GEMINI_API_KEY="your-gemini-api-key"
AI_MODEL="gemini-1.5-pro"
AI_TEMPERATURE="0.3"
AI_MAX_TOKENS="2048"

# Uygulama
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="FinWise AI"

# PDF
PDF_STORAGE_PATH="./public/reports"
```

---

## 17. Kurulum Komutları

```bash
# 1. Depoyu klonla
git clone https://github.com/your-org/finwise-ai.git
cd finwise-ai

# 2. Bağımlılıkları yükle
npm install

# 3. Ortam değişkenlerini ayarla
# .env.local dosyasını düzenle

# 4. Veritabanını oluştur
npx prisma db push

# 5. Seed verisini yükle
npx prisma db seed

# 6. Geliştirme sunucusunu başlat
npm run dev

# 7. Production build testi
npm run build
npm run start
```

---

## 18. README İçerik Şablonu

README şu bölümleri içerecek:

1. Proje başlığı, rozet satırı (Next.js, TypeScript, Prisma, Gemini AI)
2. Kısa proje açıklaması (3-4 cümle)
3. Özellikler listesi (madde madde, ikon ile)
4. Teknoloji stack tablosu
5. Ekran görüntüleri (varsa)
6. Hızlı başlangıç (kurulum komutları)
7. Ortam değişkenleri açıklaması
8. Prisma komutları (`db push`, `migrate`, `studio`, `seed`)
9. Demo kullanıcı bilgileri
10. Admin kullanıcı bilgileri
11. AI provider yapılandırması (Gemini API key alma adımları)
12. Çalıştırma komutları (dev, build, start, lint)
13. Hackathon sunum notları (öne çıkan özellikler, teknik kararlar)
14. Katkı rehberi (opsiyonel)
15. Lisans

---

## 19. Geliştirme Sırası

Aşağıdaki sırayı takip et. Her adım bir sonrakinin altyapısına bağlıdır:

```
1. Prisma schema → DB push → seed script
2. Auth.js kurulumu → register/login/session API
3. Middleware → route koruması → role guard
4. lib/finance/calculations.ts → tüm fonksiyonlar
5. lib/ai/provider.ts → lib/ai/schemas.ts → lib/ai/prompts.ts
6. lib/ai/agents.ts → lib/ai/orchestrator.ts
7. CRUD API'leri (income, expenses, goals, debts, subscriptions)
8. Analytics API'leri
9. AI API'leri
10. Reports + PDF API'si
11. Admin API'leri
12. Landing page (/)
13. Auth sayfaları
14. Onboarding akışı
15. App shell + sidebar
16. Dashboard
17. Tüm app sayfaları
18. Admin paneli
19. Final build testi + hata düzeltme
20. README + `.env.local` güncelleme
```

---

> **Son Not:** Bu bir hackathon projesi olsa da kod kalitesi production standardında olacak. Her satır, gerçek bir ürün mimarisinde yazılıyormuş gibi düşünülerek üretilecek. Kısayol yok, mock yok, placeholder yok.
