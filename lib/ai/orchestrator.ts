// AI Orchestrator - Kullanıcı mesajını analiz eder, doğru agent'ı seçer ve çağırır.

import { prisma } from "@/lib/prisma";
import { generateAIResponse, generateAIJSON, streamAIJSONChunks, cleanJSONText } from "./provider";
import { ORCHESTRATOR_INTENT_PROMPT } from "./prompts";
import {
  SpendingAnalysisAgent,
  BudgetPlannerAgent,
  GoalPlannerAgent,
  DebtRiskAgent,
  SubscriptionWasteAgent,
  FinancialHealthAgent,
  ActionPlanAgent,
  ReportAgent,
  ExplanationAgent,
  buildSpendingAnalysisPrompt,
  buildGoalPlannerPrompt,
  buildDebtRiskPrompt,
  buildSubscriptionWastePrompt,
  buildFinancialHealthPrompt,
  buildFinancialHealthFallbackResponse,
  buildActionPlanPrompt,
  buildExplanationPrompt,
  buildIncomeExpenseBalancePrompt,
  buildTableFormatPrompt,
  buildExplainPreviousPrompt,
  buildMonthlyActionPlanPrompt,
  buildBudgetOverrunPrompt,
  buildBudgetPlannerPrompt,
  buildDebtAnalysisPrompt,
  type AgentInput,
  type FinancialContext,
  type ConversationContext,
} from "./agents";
import {
  AIResponseSchema,
  ActionPlanOutputSchema,
  type AIResponse,
} from "./schemas";
import { formatAIResponseForChat } from "./format-response";
import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateNetCashflow,
  calculateSavingRate,
  calculateDebtLoadRatio,
  calculateFinancialHealthScore,
  calculateTotalDebtMonthlyPayments,
} from "@/lib/finance/calculations";

export type AgentType =
  | "SpendingAnalysisAgent"
  | "BudgetPlannerAgent"
  | "GoalPlannerAgent"
  | "DebtRiskAgent"
  | "SubscriptionWasteAgent"
  | "FinancialHealthAgent"
  | "ActionPlanAgent"
  | "ReportAgent"
  | "ExplanationAgent";

type ExtendedIntent =
  | AgentType
  | "income_expense_balance"
  | "table_format"
  | "explain_previous"
  | "monthly_action_plan"
  | "budget_overrun"
  | "spending_risk"
  | "debt_analysis";

function intentToAgentType(intent: ExtendedIntent): AgentType {
  const overrides: Partial<Record<ExtendedIntent, AgentType>> = {
    income_expense_balance: "SpendingAnalysisAgent",
    table_format: "ReportAgent",
    explain_previous: "ExplanationAgent",
    monthly_action_plan: "ActionPlanAgent",
    budget_overrun: "BudgetPlannerAgent",
    spending_risk: "SpendingAnalysisAgent",
    debt_analysis: "DebtRiskAgent",
  };
  return overrides[intent] ?? (intent as AgentType);
}

async function loadConversationContext(conversationId: string): Promise<ConversationContext> {
  const rawMessages = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true, metadataJson: true },
  });

  // Reverse to restore chronological order after desc fetch
  const messages = [...rawMessages].reverse();

  const recentHistory = messages.map(m => ({
    role: m.role as "USER" | "ASSISTANT",
    content: m.content.slice(0, 800),
  }));

  const lastAssistant = [...messages].reverse().find(m => m.role === "ASSISTANT");
  let lastAssistantMetadata: import("./schemas").AIResponse | null = null;
  if (lastAssistant?.metadataJson) {
    try {
      lastAssistantMetadata = JSON.parse(lastAssistant.metadataJson) as import("./schemas").AIResponse;
    } catch { /* ignore */ }
  }

  return {
    lastAssistantContent: lastAssistant?.content ?? "",
    lastAssistantMetadata,
    recentHistory,
  };
}

function isSimpleGreeting(message: string): boolean {
  const greetings = ["merhaba", "selam", "hey", "hi", "hello", "naber", "nasılsın", "iyi günler", "günaydın", "iyi akşamlar", "sa ", "as ", "selamlar"];
  const lower = message.toLowerCase().trim();
  return greetings.some(g => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!") || lower.startsWith(g + ","));
}

function normalizeIntentText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTableRequest(message: string): boolean {
  const normalized = normalizeIntentText(message);
  return normalized.includes("tablo") || normalized.includes("table");
}

type HealthScoreBreakdown = {
  score: number;
  incomeExpenseRatio: number;
  savingRate: number;
  debtLoad: number;
  spendingDiscipline: number;
  goalProgress: number;
};

function resolveHealthScoreBreakdown(
  financialData: FinancialContext,
  latestScore?: Partial<HealthScoreBreakdown> | null,
): HealthScoreBreakdown {
  const calculated = financialData.healthScoreBreakdown ?? {
    score: financialData.healthScore ?? 0,
    incomeExpenseRatio: 0,
    savingRate: 0,
    debtLoad: 0,
    spendingDiscipline: 0,
    goalProgress: 0,
  };

  if (!latestScore) return calculated;

  const latestComponents = [
    latestScore.incomeExpenseRatio,
    latestScore.savingRate,
    latestScore.debtLoad,
    latestScore.spendingDiscipline,
    latestScore.goalProgress,
  ];
  const hasUsefulComponents = latestComponents.some(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );

  if (!hasUsefulComponents) return calculated;

  return {
    score: latestScore.score ?? calculated.score,
    incomeExpenseRatio: latestScore.incomeExpenseRatio ?? calculated.incomeExpenseRatio,
    savingRate: latestScore.savingRate ?? calculated.savingRate,
    debtLoad: latestScore.debtLoad ?? calculated.debtLoad,
    spendingDiscipline: latestScore.spendingDiscipline ?? calculated.spendingDiscipline,
    goalProgress: latestScore.goalProgress ?? calculated.goalProgress,
  };
}

function extractRequestedItemCount(message?: string): number | null {
  if (!message) return null;
  const lower = message.toLocaleLowerCase("tr-TR");
  const digitMatch = lower.match(/\b([1-9])\s*(?:madde|maddelik|adım|adim|aksiyon|görev|gorev|plan)\b/);
  if (digitMatch) return Math.min(8, Math.max(1, Number(digitMatch[1])));
  if (/\b(üç|uc)\s*(?:madde|maddelik|adım|adim|aksiyon|görev|gorev|plan)\b/.test(lower)) return 3;
  if (/\b(iki)\s*(?:madde|maddelik|adım|adim|aksiyon|görev|gorev|plan)\b/.test(lower)) return 2;
  if (/\b(beş|bes)\s*(?:madde|maddelik|adım|adim|aksiyon|görev|gorev|plan)\b/.test(lower)) return 5;
  return null;
}

async function detectIntent(
  userMessage: string,
  conversationCtx?: ConversationContext,
): Promise<ExtendedIntent> {
  const norm = normalizeIntentText(userMessage);
  const hasHistory = (conversationCtx?.recentHistory.length ?? 0) > 0;

  // 1. Tablo formatı isteği (en yüksek öncelik — format isteği, konu değil)
  if (norm.includes("tablo") || norm.includes("table")) {
    return "table_format";
  }

  // 2. Önceki cevabı açıkla / detaylandır (bağlam gerektiriyor)
  if (hasHistory && (
    /\bbunu\b/.test(norm) && (norm.includes("acikla") || norm.includes("detayla") || norm.includes("genislet") || norm.includes("anlat") || norm.includes("goster")) ||
    norm.includes("son konustugumuz") ||
    norm.includes("detaylandir") ||
    norm.includes("neden boyle") ||
    norm.includes("guclu ve zayif") ||
    norm.includes("guclu zayif") ||
    (norm.includes("daha") && (norm.includes("detayli") || norm.includes("acikla") || norm.includes("anlatir")))
  )) {
    return "explain_previous";
  }

  // 3. Aylık plan / 3 aylık plan (haftalık ActionPlanAgent'tan önce kontrol et)
  if (
    /3\s*aylik|uc\s*aylik|3\s*ay(lik)?\s*(plan|icin|boyunca)/.test(norm) ||
    /aylik\s*(plan|aksiyon)/.test(norm) ||
    norm.includes("ay 1") || norm.includes("ay 2") || norm.includes("ay 3")
  ) {
    return "monthly_action_plan";
  }

  // 4. Gelir-Gider dengesi (SpendingAgent'tan önce — her ikisi birden geçiyorsa denge sorusu)
  if (
    (norm.includes("gelir") && norm.includes("gider")) ||
    norm.includes("nakit akis") ||
    (norm.includes("tasarruf") && norm.includes("orani")) ||
    (norm.includes("denge") && (norm.includes("gelir") || norm.includes("gider")))
  ) {
    return "income_expense_balance";
  }

  // 5. Harcama riski — özellikle "riskli alan/kategori" ifadesi
  if (
    norm.includes("riskli alan") ||
    norm.includes("riskli gider") ||
    norm.includes("riskli kategori") ||
    (norm.includes("riskli") && (norm.includes("nere") || norm.includes("hangi"))) ||
    norm.includes("en cok nereye") ||
    norm.includes("en fazla nereye")
  ) {
    return "spending_risk";
  }

  // 6. Bütçe aşımı
  if (
    (norm.includes("butce") && (norm.includes("asim") || norm.includes("astim") || norm.includes("asildi") || norm.includes("var mi"))) ||
    norm.includes("butce asim")
  ) {
    return "budget_overrun";
  }

  // 7. Detaylı borç analizi + öncelik (basit borç sorusundan önce)
  if (
    (norm.includes("borc") || norm.includes("borcum")) &&
    (norm.includes("analiz") || norm.includes("oncelik") || norm.includes("siralama") || norm.includes("yonet") || norm.includes("strateji"))
  ) {
    return "debt_analysis";
  }

  // 8. Finansal sağlık skoru
  if (
    norm.includes("skor") ||
    (norm.includes("saglik") && (norm.includes("skoru") || norm.includes("puanim") || norm.includes("durumum"))) ||
    norm.includes("finansal durumum nasil")
  ) {
    return "FinancialHealthAgent";
  }

  // 9. Hedef planlama — ne kadar ayırmalıyım gibi
  if (
    norm.includes("hedef") &&
    (norm.includes("ne kadar") || norm.includes("kac") || norm.includes("ayirmali") || norm.includes("ulasabilir") || norm.includes("plan"))
  ) {
    return "GoalPlannerAgent";
  }

  // 10. Borç (genel)
  if (norm.includes("borc") || norm.includes("kredi") || norm.includes("faiz")) {
    return "DebtRiskAgent";
  }

  // 11. Abonelik
  if (norm.includes("abonelik") || norm.includes("netflix") || norm.includes("spotify") || norm.includes("ucretsiz")) {
    return "SubscriptionWasteAgent";
  }

  // 12. Haftalık aksiyon planı
  if (
    norm.includes("aksiyon") ||
    norm.includes("gorev") ||
    norm.includes("yapilacak") ||
    norm.includes("bu hafta") ||
    norm.includes("ne yapmali")
  ) {
    return "ActionPlanAgent";
  }

  // 13. Harcama analizi (gider tek başına geçiyorsa)
  if (
    norm.includes("harcama") ||
    norm.includes("harcadim") ||
    norm.includes("masraf") ||
    norm.includes("market") ||
    norm.includes("alisveris") ||
    norm.includes("gider") ||
    norm.includes("azalt") ||
    norm.includes("dusur") ||
    norm.includes("nereye")
  ) {
    return "SpendingAnalysisAgent";
  }

  // 14. Bütçe planlama
  if (norm.includes("butce") || (norm.includes("plan") && !norm.includes("hedef"))) {
    return "BudgetPlannerAgent";
  }

  // 15. Tasarruf / hedef genel
  if (norm.includes("tasarruf") || norm.includes("biriktir") || norm.includes("hedef")) {
    return "GoalPlannerAgent";
  }

  // 16. Rapor / özet → genel finansal özet isteniyor, FinancialHealthAgent daha uygun
  if (norm.includes("rapor") || norm.includes("ozet")) {
    return "FinancialHealthAgent";
  }

  // 17. Gemini LLM ile intent tespiti
  try {
    const response = await generateAIResponse(
      [{ role: "user", content: `Kullanıcı mesajı: "${userMessage}"` }],
      { systemPrompt: ORCHESTRATOR_INTENT_PROMPT, temperature: 0.1, maxTokens: 50 },
    );
    const agentName = response.text.trim() as AgentType;
    const validAgents: AgentType[] = [
      "SpendingAnalysisAgent", "BudgetPlannerAgent", "GoalPlannerAgent",
      "DebtRiskAgent", "SubscriptionWasteAgent", "FinancialHealthAgent",
      "ActionPlanAgent", "ReportAgent", "ExplanationAgent",
    ];
    if (validAgents.includes(agentName)) return agentName;
  } catch { /* heuristic fallback */ }

  return "ExplanationAgent";
}

async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  const [
    user,
    incomes,
    expenses,
    debts,
    goals,
    subscriptions,
    recentIncomes,
    recentExpenses,
    recentTransactions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        currency: true,
        profile: {
          select: {
            incomeFrequency: true,
            financialGoalType: true,
            riskTolerance: true,
            hasDebt: true,
            onboardingCompleted: true,
          },
        },
      },
    }),
    prisma.income.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      include: { category: true },
    }),
    prisma.debt.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.goal.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.subscription.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.income.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.expense.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  const currency = user?.currency ?? "TRY";
  const monthlyIncome = calculateMonthlyIncome(incomes);
  const monthlyExpenses = calculateMonthlyExpenses(expenses);
  const netCashflow = calculateNetCashflow(monthlyIncome, monthlyExpenses);
  const savingRate = calculateSavingRate(netCashflow, monthlyIncome);
  const totalDebtPayments = calculateTotalDebtMonthlyPayments(debts);
  const debtLoadRatio = calculateDebtLoadRatio(totalDebtPayments, monthlyIncome);

  // Kategori bazlı harcama özeti
  const categoryMap = new Map<string, { name: string; amount: number }>();
  expenses.forEach((e: { amount: number; categoryId?: string | null; category?: { name: string } | null }) => {
    const key = e.categoryId ?? "other";
    const name = e.category?.name ?? "Diğer";
    const existing = categoryMap.get(key);
    if (existing) {
      existing.amount += e.amount;
    } else {
      categoryMap.set(key, { name, amount: e.amount });
    }
  });

  const topExpenseCategories = Array.from(categoryMap.entries())
    .map(([, v]) => ({
      categoryName: v.name,
      amount: v.amount,
      percent: monthlyExpenses > 0 ? (v.amount / monthlyExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Finansal sağlık skoru
  const healthScoreResult = calculateFinancialHealthScore({
    monthlyIncome,
    monthlyExpenses,
    totalMonthlyDebtPayments: totalDebtPayments,
    totalSavings: 0,
    goals: goals.map((g: { currentAmount: number; targetAmount: number }) => ({ currentAmount: g.currentAmount, targetAmount: g.targetAmount })),
    budgetCategories: [],
  });

  return {
    monthlyIncome,
    monthlyExpenses,
    netCashflow,
    savingRate,
    debtLoadRatio,
    healthScore: healthScoreResult.score,
    healthScoreBreakdown: {
      score: healthScoreResult.score,
      incomeExpenseRatio: healthScoreResult.incomeExpenseRatio,
      savingRate: healthScoreResult.savingRate,
      debtLoad: healthScoreResult.debtLoad,
      spendingDiscipline: healthScoreResult.spendingDiscipline,
      goalProgress: healthScoreResult.goalProgress,
    },
    currency,
    currentMonth,
    currentYear,
    profile: user?.profile
      ? {
          incomeFrequency: user.profile.incomeFrequency,
          financialGoalType: user.profile.financialGoalType,
          riskTolerance: user.profile.riskTolerance,
          hasDebt: user.profile.hasDebt,
          onboardingCompleted: user.profile.onboardingCompleted,
        }
      : undefined,
    topExpenseCategories,
    recentIncomes: recentIncomes.map((i: { title: string; amount: number; category: string; frequency: string; date: Date }) => ({
      title: i.title,
      amount: i.amount,
      category: i.category,
      frequency: i.frequency,
      date: i.date.toISOString().split("T")[0],
    })),
    recentExpenses: recentExpenses.map((e: { title: string; amount: number; paymentMethod: string; isRecurring: boolean; date: Date; category?: { name: string } | null }) => ({
      title: e.title,
      amount: e.amount,
      category: e.category?.name ?? "Diger",
      paymentMethod: e.paymentMethod,
      isRecurring: e.isRecurring,
      date: e.date.toISOString().split("T")[0],
    })),
    recentTransactions: recentTransactions.map((t: { title: string; amount: number; type: string; date: Date; category?: { name: string } | null }) => ({
      title: t.title,
      amount: t.amount,
      type: t.type,
      category: t.category?.name ?? "Diger",
      date: t.date.toISOString().split("T")[0],
    })),
    debts: debts.map((d: { id: string; title: string; type: string; remainingAmount: number; minimumPayment: number; interestRate: number }) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      remainingAmount: d.remainingAmount,
      minimumPayment: d.minimumPayment,
      interestRate: d.interestRate,
    })),
    goals: goals.map((g: { id: string; title: string; targetAmount: number; currentAmount: number; deadline?: Date | null }) => ({
      id: g.id,
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      deadline: g.deadline?.toISOString().split("T")[0] ?? null,
      progressPercent: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0,
    })),
    subscriptions: subscriptions.map((s: { id: string; title: string; amount: number; billingCycle: string }) => ({
      id: s.id,
      title: s.title,
      amount: s.amount,
      billingCycle: s.billingCycle,
      monthlyAmount: s.billingCycle === "MONTHLY" ? s.amount : s.amount / 12,
    })),
  };
}

export interface OrchestratorResult {
  agentUsed: AgentType;
  response: AIResponse;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
}

export async function orchestrate(
  userId: string,
  userMessage: string,
  conversationId?: string,
  forceAgent?: AgentType,
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  let agentUsed: AgentType = "ExplanationAgent";
  let response!: AIResponse;
  let fallbackInput: AgentInput | undefined;

  try {
    // 1. Selamlama kontrolü — kısa karşılık ver, tam analiz yapma
    if (!forceAgent && isSimpleGreeting(userMessage)) {
      const greetingResponse: AIResponse = {
        summary: "Merhaba! Ben FinWise AI, kişisel finans asistanınım. Bütçeniz, harcamalarınız, borçlarınız veya tasarruf hedefleriniz hakkında ne öğrenmek istersiniz?",
        diagnosis: { status: "good", mainIssue: "", explanation: "" },
        insights: [],
        recommendations: [],
        numbers: {},
        actionItems: [],
        followUps: ["Bu ay ne kadar harcadım?", "Bütçemi nasıl düzenleyebilirim?", "Finansal sağlık skorumu göster"],
        disclaimer: "",
      };

      let activeConversationId = conversationId ?? "";
      if (!activeConversationId) {
        const conversation = await prisma.aIConversation.create({
          data: { userId, title: userMessage.slice(0, 50) },
        });
        activeConversationId = conversation.id;
      }
      const [userMsg, assistantMsg] = await Promise.all([
        prisma.aIMessage.create({ data: { conversationId: activeConversationId, role: "USER", content: userMessage } }),
        prisma.aIMessage.create({ data: { conversationId: activeConversationId, role: "ASSISTANT", content: greetingResponse.summary, metadataJson: JSON.stringify(greetingResponse) } }),
      ]);
      return { agentUsed: "ExplanationAgent", response: greetingResponse, conversationId: activeConversationId, userMessageId: userMsg.id, assistantMessageId: assistantMsg.id };
    }

    // 2. Konuşma bağlamı + intent analizi
    let orchConvCtx: ConversationContext | undefined;
    if (conversationId) {
      orchConvCtx = await loadConversationContext(conversationId).catch(() => undefined);
    }
    const orchIntent: ExtendedIntent = forceAgent
      ? (forceAgent as ExtendedIntent)
      : await detectIntent(userMessage, orchConvCtx);
    agentUsed = intentToAgentType(orchIntent);

    // 3. Finansal veri çek ve hesaplamalar yap
    const financialData = await buildFinancialContext(userId);
    const agentInput: AgentInput = { userId, userMessage, financialData, conversationContext: orchConvCtx };
    fallbackInput = agentInput;

    const skipDirectMetricOrch: ExtendedIntent[] = [
      "income_expense_balance", "table_format", "explain_previous",
      "monthly_action_plan", "budget_overrun", "spending_risk", "debt_analysis",
      "FinancialHealthAgent", "GoalPlannerAgent", "DebtRiskAgent", "BudgetPlannerAgent",
    ];
    const directMetricResponse = skipDirectMetricOrch.includes(orchIntent)
      ? null
      : buildDirectMetricResponse(agentInput);

    // 4. İlgili agent'ı çağır
    if (directMetricResponse) {
      response = directMetricResponse;
      agentUsed = "SpendingAnalysisAgent";
    } else switch (orchIntent) {
      case "income_expense_balance": {
        const { prompt, systemPrompt } = buildIncomeExpenseBalancePrompt(agentInput);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "SpendingAnalysisAgent");
        break;
      }
      case "table_format": {
        const { prompt, systemPrompt } = buildTableFormatPrompt(agentInput, orchConvCtx);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "ReportAgent");
        break;
      }
      case "explain_previous": {
        const { prompt, systemPrompt } = buildExplainPreviousPrompt(agentInput, orchConvCtx);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "ExplanationAgent");
        break;
      }
      case "monthly_action_plan": {
        const { prompt, systemPrompt } = buildMonthlyActionPlanPrompt(agentInput);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "ActionPlanAgent");
        break;
      }
      case "budget_overrun": {
        const { prompt, systemPrompt } = buildBudgetOverrunPrompt(agentInput);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "BudgetPlannerAgent");
        break;
      }
      case "BudgetPlannerAgent": {
        const { prompt, systemPrompt } = buildBudgetPlannerPrompt(agentInput);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "BudgetPlannerAgent");
        break;
      }
      case "debt_analysis": {
        const { prompt, systemPrompt } = buildDebtAnalysisPrompt(agentInput);
        const rawJson = await generateAIJSON<unknown>(prompt, systemPrompt);
        response = AIResponseSchema.safeParse(rawJson).data ?? buildDeterministicFallbackResponse(agentInput, "DebtRiskAgent");
        break;
      }
      case "spending_risk":
      case "SpendingAnalysisAgent":
        response = await SpendingAnalysisAgent(agentInput);
        break;
      case "GoalPlannerAgent":
        response = await GoalPlannerAgent(agentInput);
        break;
      case "DebtRiskAgent":
        response = await DebtRiskAgent(agentInput);
        break;
      case "SubscriptionWasteAgent":
        response = await SubscriptionWasteAgent(agentInput);
        break;
      case "FinancialHealthAgent": {
        const latestScore = await prisma.financialHealthScore.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        const scoreBreakdown = resolveHealthScoreBreakdown(financialData, latestScore);
        try {
          response = await FinancialHealthAgent(agentInput, scoreBreakdown);
        } catch {
          response = buildFinancialHealthFallbackResponse(agentInput, scoreBreakdown);
        }
        break;
      }
      case "ActionPlanAgent": {
        const planOutput = await ActionPlanAgent(agentInput);
        response = {
          summary: planOutput.summary,
          diagnosis: { status: "good", mainIssue: planOutput.title, explanation: planOutput.summary },
          insights: planOutput.items.slice(0, 3).map((item) => ({
            title: item.title,
            description: item.description,
            severity: item.priority === "HIGH" ? "high" : item.priority === "MEDIUM" ? "medium" : "low",
          })),
          recommendations: planOutput.items.map((item) => ({
            title: item.title,
            action: item.description,
            difficulty: "easy" as const,
          })),
          numbers: {},
          actionItems: planOutput.items.map((item) => ({
            title: item.title,
            description: item.description,
            dueInDays: item.dueInDays,
            priority: item.priority === "HIGH" ? "high" : item.priority === "MEDIUM" ? "medium" : "low",
          })),
          disclaimer: "Bu bilgiler yalnızca genel bilgilendirme amaçlıdır; kişisel finansal yatırım tavsiyesi niteliği taşımaz.",
        };
        break;
      }
      case "ExplanationAgent":
        response = await ExplanationAgent(userMessage);
        break;
      default:
        response = await SpendingAnalysisAgent(agentInput);
    }

    // 4. Konuşma ve mesajları kaydet
    response = sanitizeAIResponseWithFinancialData(response, financialData, agentUsed, userMessage);

    const durationMs = Date.now() - startTime;

    let activeConversationId: string = conversationId ?? "";
    if (!activeConversationId) {
      const conversation = await prisma.aIConversation.create({
        data: { userId, title: userMessage.slice(0, 50) },
      });
      activeConversationId = conversation.id;
    }

    const [userMsg, assistantMsg] = await Promise.all([
      prisma.aIMessage.create({
        data: {
          conversationId: activeConversationId,
          role: "USER",
          content: userMessage,
        },
      }),
      prisma.aIMessage.create({
        data: {
          conversationId: activeConversationId,
          role: "ASSISTANT",
          content: formatAIResponseForChat(response),
          metadataJson: JSON.stringify(response),
        },
      }),
    ]);

    // 5. AI Analysis logu kaydet
    await prisma.aIAnalysis.create({
      data: {
        userId,
        type: agentUsed,
        inputJson: JSON.stringify({ userMessage, financialContext: agentInput.financialData }),
        outputJson: JSON.stringify(response),
        durationMs,
      },
    });

    return {
      agentUsed,
      response,
      conversationId: activeConversationId,
      userMessageId: userMsg.id,
      assistantMessageId: assistantMsg.id,
    };
  } catch (error) {
    if (fallbackInput) {
      const fallbackResponse = buildDeterministicFallbackResponse(fallbackInput, agentUsed);
      let activeConversationId: string = conversationId ?? "";

      if (!activeConversationId) {
        const conversation = await prisma.aIConversation.create({
          data: { userId, title: userMessage.slice(0, 50) },
        });
        activeConversationId = conversation.id;
      }

      const [userMsg, assistantMsg] = await Promise.all([
        prisma.aIMessage.create({
          data: { conversationId: activeConversationId, role: "USER", content: userMessage },
        }),
        prisma.aIMessage.create({
          data: {
            conversationId: activeConversationId,
            role: "ASSISTANT",
            content: formatAIResponseForChat(fallbackResponse),
            metadataJson: JSON.stringify(fallbackResponse),
          },
        }),
      ]);

      await prisma.aIAnalysis.create({
        data: {
          userId,
          type: agentUsed,
          inputJson: JSON.stringify({ userMessage, financialContext: fallbackInput.financialData }),
          outputJson: JSON.stringify(fallbackResponse),
          isError: true,
          errorMessage: error instanceof Error ? error.message : "Bilinmeyen hata",
          durationMs: Date.now() - startTime,
        },
      }).catch(() => {});

      return {
        agentUsed,
        response: fallbackResponse,
        conversationId: activeConversationId,
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
      };
    }
    // Hata durumunda log yaz ama fallback döndür
    await prisma.aIAnalysis.create({
      data: {
        userId,
        type: agentUsed,
        inputJson: JSON.stringify({ userMessage }),
        isError: true,
        errorMessage: error instanceof Error ? error.message : "Bilinmeyen hata",
        durationMs: Date.now() - startTime,
      },
    }).catch(() => {});

    throw error;
  }
}

// ============================================================
// STREAM-NATIVE ORCHESTRATOR
// ============================================================

export type StreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "metadata";
      response: AIResponse;
      conversationId: string;
      agentUsed: AgentType;
      messageId: string;
    }
  | { type: "error"; text: string }
  | { type: "done" };

/**
 * Incrementally extracts the "summary" field value from a partially-accumulated
 * JSON string. Returns the decoded text seen so far and whether it's complete.
 */
function extractSummaryProgress(accumulated: string): { text: string; complete: boolean } {
  const startMatch = accumulated.match(/"summary"\s*:\s*"/);
  if (!startMatch || startMatch.index === undefined) return { text: "", complete: false };

  const valueStart = startMatch.index + startMatch[0].length;
  const rest = accumulated.slice(valueStart);
  let text = "";

  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "\\") {
      if (i + 1 < rest.length) {
        const next = rest[i + 1];
        switch (next) {
          case "n":  text += "\n"; break;
          case "t":  text += "\t"; break;
          case "r":  text += "\r"; break;
          case '"':  text += '"';  break;
          case "\\": text += "\\"; break;
          default:   text += next;
        }
        i++;
      }
    } else if (rest[i] === '"') {
      return { text, complete: true };
    } else {
      text += rest[i];
    }
  }

  return { text, complete: false };
}

function convertActionPlanToAIResponse(plan: {
  title: string;
  summary: string;
  items: Array<{
    title: string;
    description: string;
    category: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    dueInDays?: number;
  }>;
}, requestedCount?: number | null): AIResponse {
  const items = requestedCount ? plan.items.slice(0, requestedCount) : plan.items;
  return {
    summary: plan.summary,
    diagnosis: { status: "good", mainIssue: plan.title, explanation: plan.summary },
    insights: items.slice(0, 3).map((item) => ({
      title: item.title,
      description: item.description,
      severity: item.priority === "HIGH" ? "high" : item.priority === "MEDIUM" ? "medium" : "low",
    })),
    recommendations: items.map((item) => ({
      title: item.title,
      action: item.description,
      difficulty: "easy" as const,
    })),
    numbers: {},
    actionItems: items.map((item) => ({
      title: item.title,
      description: item.description,
      dueInDays: item.dueInDays,
      priority: item.priority === "HIGH" ? "high" : item.priority === "MEDIUM" ? "medium" : "low",
    })),
    disclaimer:
      "Bu bilgiler yalnızca genel bilgilendirme amaçlıdır; kişisel finansal yatırım tavsiyesi niteliği taşımaz.",
  };
}

function formatCompactAssistantContent(response: AIResponse, agent: AgentType): string {
  return response.summary.trim() || response.diagnosis.explanation.trim();
}

const DIRECT_RESPONSE_DISCLAIMER =
  "Bu bilgiler kayıtlı finansal verilerine göre hazırlanmış genel bilgilendirmedir; yatırım tavsiyesi değildir.";

function getCurrencySymbol(currency?: string): string {
  const normalized = (currency || "TRY").toUpperCase();
  const symbols: Record<string, string> = {
    TRY: "₺",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  return symbols[normalized] ?? normalized;
}

function formatMoneyAmount(amount: number, currency?: string): string {
  const safeAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
  const value = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 0,
  }).format(safeAmount);

  return `${value} ${getCurrencySymbol(currency)}`;
}

function formatSignedMoneyAmount(amount: number, currency?: string): string {
  return amount < 0 ? `-${formatMoneyAmount(amount, currency)}` : formatMoneyAmount(amount, currency);
}

function formatCashflowPhrase(amount: number, currency?: string): string {
  if (amount > 0) return `${formatMoneyAmount(amount, currency)} fazla veriyor`;
  if (amount < 0) return `${formatMoneyAmount(amount, currency)} açık veriyor`;
  return "tam dengede görünüyor";
}

function formatPercentValue(value: number): string {
  return `%${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0)}`;
}

function sanitizeAIResponseWithFinancialData(
  response: AIResponse,
  financialData: FinancialContext,
  agent: AgentType,
  userMessage?: string,
): AIResponse {
  const normalizedMessage = normalizeIntentText(userMessage ?? "");
  const safeResponse: AIResponse = {
    ...response,
    insights: dedupeByTitle(response.insights).slice(0, 4),
    recommendations: dedupeByTitle(response.recommendations).slice(0, 4),
    actionItems: dedupeByTitle(response.actionItems).slice(0, 4),
    numbers:
      agent === "ExplanationAgent"
        ? {}
        : {
            monthlyIncome: financialData.monthlyIncome,
            monthlyExpense: financialData.monthlyExpenses,
            estimatedSaving: Math.max(financialData.netCashflow, 0),
            debtLoadRatio: financialData.debtLoadRatio,
            financialHealthScore: financialData.healthScore,
          },
  };

  if (agent === "SpendingAnalysisAgent") {
    const topCategory = financialData.topExpenseCategories[0];
    // AI'ın ürettiği özet yeterliyse (>80 karakter) üzerine yazma; directMetric fallback için kısa özetleri düzelt
    const aiSummaryIsRich = safeResponse.summary.length > 80;
    if (!aiSummaryIsRich) {
      if (normalizedMessage.includes("ne kadar") || normalizedMessage.includes("harcadim")) {
        safeResponse.summary = topCategory
          ? `Bu ay kayıtlı toplam giderin ${formatMoneyAmount(financialData.monthlyExpenses, financialData.currency)}. Nakit akışın ${formatCashflowPhrase(financialData.netCashflow, financialData.currency)}. En yüksek gider alanın ${topCategory.categoryName}; bu kategori ${formatMoneyAmount(topCategory.amount, financialData.currency)} ile toplam giderinin yaklaşık ${formatPercentValue(topCategory.percent)} kısmını oluşturuyor.`
          : `Bu ay kayıtlı toplam giderin ${formatMoneyAmount(financialData.monthlyExpenses, financialData.currency)}. Nakit akışın ${formatCashflowPhrase(financialData.netCashflow, financialData.currency)}. Kategori bazlı detay çıkarmak için gider kayıtlarının kategoriyle eklenmesi gerekiyor.`;
      } else if (normalizedMessage.includes("riskli") || normalizedMessage.includes("risk")) {
        safeResponse.summary = topCategory
          ? `Giderlerinde en riskli alan ${topCategory.categoryName}. Bu kategori ${formatMoneyAmount(topCategory.amount, financialData.currency)} ile toplam giderinin yaklaşık ${formatPercentValue(topCategory.percent)} kısmını oluşturuyor; önce bu kalemi kontrol etmek en doğru başlangıç olur.`
          : "Riskli gider alanını belirlemek için bu ay kategori bazlı gider kaydı görünmüyor. Önce giderleri kategoriyle kaydetmek gerekiyor.";
      }
    }

    safeResponse.chart = financialData.topExpenseCategories.length
      ? {
          type: "bar",
          title: "En yüksek gider kategorileri",
          unit: financialData.currency,
          data: financialData.topExpenseCategories.slice(0, 5).map((category) => ({
            label: category.categoryName,
            value: category.amount,
          })),
        }
      : undefined;
  }

  if (agent === "FinancialHealthAgent" && financialData.healthScoreBreakdown) {
    const breakdown = financialData.healthScoreBreakdown;
    safeResponse.chart = {
      type: "bar",
      title: "Finansal sağlık bileşenleri",
      unit: "puan",
      data: [
        { label: "Gelir-Gider", value: breakdown.incomeExpenseRatio },
        { label: "Tasarruf", value: breakdown.savingRate },
        { label: "Borç Kontrolü", value: breakdown.debtLoad },
        { label: "Harcama", value: breakdown.spendingDiscipline },
        { label: "Hedefler", value: breakdown.goalProgress },
      ],
    };
  }

  if (agent !== "SpendingAnalysisAgent" && agent !== "FinancialHealthAgent") {
    safeResponse.chart = undefined;
  }

  return safeResponse;
}

function dedupeByTitle<T extends { title: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.trim().toLocaleLowerCase("tr-TR");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildDirectMetricResponse(input: AgentInput): AIResponse | null {
  const data = input.financialData;
  const normalized = normalizeIntentText(input.userMessage ?? "");
  const currency = data.currency || "TRY";
  const topCategory = data.topExpenseCategories[0];
  const monthlyIncome = formatMoneyAmount(data.monthlyIncome, currency);
  const monthlyExpense = formatMoneyAmount(data.monthlyExpenses, currency);
  const netCashflow = formatCashflowPhrase(data.netCashflow, currency);
  const topCategoryAmount = topCategory ? formatMoneyAmount(topCategory.amount, currency) : null;
  const topCategoryPercent = topCategory ? formatPercentValue(topCategory.percent) : null;

  const asksIncome =
    (normalized.includes("maas") || normalized.includes("gelir")) &&
    (normalized.includes("ne kadar") || normalized.includes("kac") || normalized.includes("toplam"));
  const asksExpense =
    (normalized.includes("harcadim") || normalized.includes("harcama") || normalized.includes("gider")) &&
    (normalized.includes("ne kadar") || normalized.includes("kac") || normalized.includes("toplam"));
  const asksRisk =
    normalized.includes("riskli") ||
    normalized.includes("risk") ||
    normalized.includes("en cok") ||
    normalized.includes("en fazla");
  const asksDebt =
    normalized.includes("borcum") ||
    normalized.includes("borc") ||
    normalized.includes("kredi");

  if (!asksIncome && !asksExpense && !asksRisk && !asksDebt) return null;

  if (asksIncome) {
    return {
      summary: `Bu ay kayıtlı toplam gelirin ${monthlyIncome}. Aynı dönemde kayıtlı giderin ${monthlyExpense} ve net nakit akışın ${netCashflow}. Bu cevap kayıtlı gelir-gider verilerine göre hesaplandı; eksik kayıt varsa sonuç değişebilir.`,
      diagnosis: {
        status: data.monthlyIncome > data.monthlyExpenses ? "good" : "warning",
        mainIssue: "Aylık gelir",
        explanation: `Kayıtlı aylık gelir ${monthlyIncome}, aylık gider ${monthlyExpense}. Bu iki değer birlikte değerlendirildiğinde ayın nakit akışı ${netCashflow}. Gelir veya gider kayıtlarında eksik ay varsa sonuç değişebilir.`,
      },
      insights: [
        {
          title: "Net nakit akışı",
          description: `Gelir-gider farkı ${netCashflow}.`,
          severity: data.netCashflow >= 0 ? "low" : "high",
        },
      ],
      recommendations: [
        {
          title: "Gelir kayıtlarını güncel tut",
          action: "Maaş, ek gelir ve tek seferlik gelirleri aynı ay içinde ayrı ayrı kaydet.",
          estimatedImpact: "AI yanıtları daha doğru hesaplanır.",
          difficulty: "easy",
        },
      ],
      numbers: {
        monthlyIncome: data.monthlyIncome,
        monthlyExpense: data.monthlyExpenses,
        estimatedSaving: Math.max(data.netCashflow, 0),
      },
      actionItems: [],
      followUps: ["Bu ay ne kadar harcadım?", "Net nakit akışımı göster", "3 aylık plan yap"],
      disclaimer: DIRECT_RESPONSE_DISCLAIMER,
    };
  }

  if (asksDebt) {
    const totalRemaining = data.debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
    const totalMinimum = data.debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
    return {
      summary: data.debts.length
        ? `Aktif borçlarında kalan toplam tutar ${formatMoneyAmount(totalRemaining, currency)}. Aylık minimum ödeme toplamın ${formatMoneyAmount(totalMinimum, currency)} ve borç yükü oranı ${formatPercentValue(data.debtLoadRatio)}.`
        : "Kayıtlı aktif borcun görünmüyor. Bu, borç kontrolü açısından güçlü bir durum; varsa kredi kartı, taksit veya elden borç gibi kayıt dışı kalemleri borçlar sayfasına eklemek sonucu daha doğru tutar.",
      diagnosis: {
        status: data.debtLoadRatio > 35 ? "risk" : data.debtLoadRatio > 20 ? "warning" : "good",
        mainIssue: data.debts.length ? "Borç yükü" : "Aktif borç yok",
        explanation: data.debts.length
          ? `Aktif borç sayısı ${data.debts.length}. Kalan borç ${formatMoneyAmount(totalRemaining, currency)}, minimum ödeme ${formatMoneyAmount(totalMinimum, currency)}. Borç yükü oranı gelire göre düzenli ödeme baskısını gösterir.`
          : "Aktif borç kaydı olmadığı için borç kaynaklı düzenli ödeme baskısı görünmüyor.",
      },
      insights: data.debts.length
        ? data.debts.slice(0, 3).map((debt) => ({
            title: debt.title,
            description: `Kalan ${formatMoneyAmount(debt.remainingAmount, currency)}, minimum ödeme ${formatMoneyAmount(debt.minimumPayment, currency)}, faiz ${formatPercentValue(debt.interestRate)}.`,
            severity: debt.interestRate > 20 ? "high" : "medium" as "medium",
          }))
        : [
            {
              title: "Borç kontrolü güçlü",
              description: "Aktif borç kaydı olmadığı için aylık borç ödeme baskısı görünmüyor.",
              severity: "low",
            },
          ],
      recommendations: [
        {
          title: "Borç listesini güncel tut",
          action: "Kalan tutar ve minimum ödeme değiştikçe borç kaydını güncelle.",
          estimatedImpact: "Borç yükü hesabı doğru kalır.",
          difficulty: "easy",
        },
      ],
      numbers: {
        monthlyIncome: data.monthlyIncome,
        debtLoadRatio: data.debtLoadRatio,
      },
      actionItems: [],
      followUps: ["Borç kapatma planı yap", "Finansal sağlık skorumu göster", "Bu ay ne kadar harcadım?"],
      disclaimer: DIRECT_RESPONSE_DISCLAIMER,
    };
  }

  if (asksRisk) {
    return {
      summary: topCategory
        ? `Giderlerinde en riskli alan ${topCategory.categoryName}. Bu kategori bu ay ${topCategoryAmount} ile toplam giderinin yaklaşık ${topCategoryPercent} kısmını oluşturuyor. Tek kategori bu kadar baskın olduğunda bütçe esnekliği azalır; ilk kontrol bu kalemde yapılmalı.`
        : "Bu ay kategori bazlı gider kaydı olmadığı için en riskli gider alanı belirlenemiyor.",
      diagnosis: {
        status: topCategory && topCategory.percent >= 50 ? "risk" : topCategory && topCategory.percent >= 30 ? "warning" : "good",
        mainIssue: topCategory?.categoryName ?? "Veri eksik",
        explanation: topCategory
          ? `${topCategory.categoryName} kategorisi toplam gider içinde en büyük paya sahip. Önce bu kategoriyi kontrol etmek en yüksek etkiyi verir.`
          : "Giderlerin kategoriyle kaydedilirse riskli alanlar otomatik belirlenebilir.",
      },
      insights: topCategory
        ? [{
            title: "En yüksek gider kategorisi",
            description: `${topCategory.categoryName}: ${topCategoryAmount} (${topCategoryPercent}).`,
            severity: topCategory.percent >= 50 ? "high" : "medium",
          }]
        : [{
            title: "Kategori verisi eksik",
            description: "Risk analizi için bu ay kategori bazlı gider kaydı görünmüyor.",
            severity: "medium",
          }],
      recommendations: [
        {
          title: "Kategori limiti koy",
          action: topCategory
            ? `${topCategory.categoryName} için bu ay üst limit belirle ve yeni harcamaları bu limite göre kontrol et.`
            : "Giderlerini kategoriyle kaydetmeye başla.",
          estimatedImpact: "En yüksek gider alanı daha erken kontrol edilir.",
          difficulty: "easy",
        },
      ],
      numbers: {
        monthlyIncome: data.monthlyIncome,
        monthlyExpense: data.monthlyExpenses,
        estimatedSaving: Math.max(data.netCashflow, 0),
      },
      actionItems: [],
      chart: data.topExpenseCategories.length
        ? {
            type: "bar",
            title: "En yüksek gider kategorileri",
            unit: data.currency,
            data: data.topExpenseCategories.slice(0, 5).map((category) => ({
              label: category.categoryName,
              value: category.amount,
            })),
          }
        : undefined,
      followUps: ["Bunu tabloyla göster", "Bu gideri nasıl düşürürüm?", "3 aylık plan yap"],
      disclaimer: DIRECT_RESPONSE_DISCLAIMER,
    };
  }

  return {
    summary: topCategory
      ? `Bu ay kayıtlı toplam giderin ${monthlyExpense}. Net nakit akışın ${netCashflow} ve tasarruf oranı ${formatPercentValue(data.savingRate)}. En büyük gider kalemin ${topCategory.categoryName}; bu kategori ${topCategoryAmount} ile toplam giderinin yaklaşık ${topCategoryPercent} kısmını oluşturuyor.`
      : `Bu ay kayıtlı toplam giderin ${monthlyExpense}. Net nakit akışın ${netCashflow} ve tasarruf oranı ${formatPercentValue(data.savingRate)}. Kategori bazlı yorum için giderlerin kategoriyle kaydedilmesi gerekiyor.`,
    diagnosis: {
      status: data.netCashflow >= 0 ? "good" : "risk",
      mainIssue: "Aylık gider",
      explanation: topCategory
        ? `En yüksek gider kategorisi ${topCategory.categoryName}; bu kategori ${topCategoryAmount} ile toplam giderinin yaklaşık ${topCategoryPercent} kısmını oluşturuyor. Nakit akışı ${netCashflow}, bu yüzden gider azaltma önerileri önce en büyük kaleme odaklanmalı.`
        : "Kategori bazlı gider kaydı olmadığı için gider dağılımı ayrıntılı yorumlanamıyor.",
    },
    insights: topCategory
      ? [{
          title: "En yüksek gider",
          description: `${topCategory.categoryName}: ${topCategoryAmount}.`,
          severity: topCategory.percent >= 50 ? "high" : "medium",
        }]
      : [{
          title: "Kategori verisi eksik",
          description: "Giderler kategoriyle kaydedildiğinde en büyük harcama alanları daha doğru belirlenir.",
          severity: "medium",
        }],
    recommendations: [
      {
        title: "Giderleri kategoriyle kontrol et",
        action: "Bu ayki en yüksek gider kategorisini haftalık olarak takip et.",
        estimatedImpact: "Harcama sapmaları daha erken görünür.",
        difficulty: "easy",
      },
    ],
    numbers: {
      monthlyIncome: data.monthlyIncome,
      monthlyExpense: data.monthlyExpenses,
      estimatedSaving: Math.max(data.netCashflow, 0),
      financialHealthScore: data.healthScore,
    },
    actionItems: [],
    chart: data.topExpenseCategories.length
      ? {
          type: "bar",
          title: "En yüksek gider kategorileri",
          unit: data.currency,
          data: data.topExpenseCategories.slice(0, 5).map((category) => ({
            label: category.categoryName,
            value: category.amount,
          })),
        }
      : undefined,
    followUps: ["Bunu tabloyla göster", "Giderlerimde en riskli alan ne?", "Bu giderleri nasıl azaltırım?"],
    disclaimer: DIRECT_RESPONSE_DISCLAIMER,
  };
}

function buildDeterministicFallbackResponse(input: AgentInput, agent: AgentType): AIResponse {
  const data = input.financialData;
  const currency = data.currency;
  const topCategory = data.topExpenseCategories[0];
  const requestedCount = agent === "ActionPlanAgent" ? (extractRequestedItemCount(input.userMessage) ?? 3) : null;
  const scoreBreakdown = data.healthScoreBreakdown ?? {
    score: data.healthScore ?? 0,
    incomeExpenseRatio: 0,
    savingRate: 0,
    debtLoad: 0,
    spendingDiscipline: 0,
    goalProgress: 0,
  };

  if (agent === "FinancialHealthAgent") {
    return buildFinancialHealthFallbackResponse(input, scoreBreakdown);
  }

  const status: "good" | "warning" | "risk" =
    data.netCashflow > 0 && data.savingRate >= 20
      ? "good"
      : data.netCashflow >= 0
        ? "warning"
        : "risk";

  const summary =
    agent === "SpendingAnalysisAgent"
      ? topCategory
        ? `Bu ay en belirgin gider alanınız ${topCategory.categoryName}. Bu kategori ${topCategory.amount.toFixed(0)} ${currency} ile toplam giderlerinizin yaklaşık %${topCategory.percent.toFixed(1)} kısmını oluşturuyor.`
        : "Bu ay için gider kategorisi verisi bulunmuyor. Harcama analizi için düzenli gider kaydı eklemeniz gerekiyor."
      : agent === "BudgetPlannerAgent" || agent === "ActionPlanAgent"
        ? `Aylık geliriniz ${data.monthlyIncome.toFixed(0)} ${currency}, gideriniz ${data.monthlyExpenses.toFixed(0)} ${currency} ve net nakit akışınız ${data.netCashflow.toFixed(0)} ${currency}. Öncelik, bu akışı koruyup hedeflere düzenli pay ayırmak olmalı.`
        : `Mevcut finansal verilerinize göre aylık net nakit akışınız ${data.netCashflow.toFixed(0)} ${currency} ve tasarruf oranınız %${data.savingRate.toFixed(1)}. Yanıt, kayıtlı gelir-gider ve hedef verileriniz üzerinden hazırlanmıştır.`;

  return {
    summary,
    diagnosis: {
      status,
      mainIssue:
        status === "good"
          ? "Nakit akışı güçlü, düzenli hedef katkısı önemli."
          : status === "warning"
            ? "Nakit akışı korunmalı ve gider dağılımı takip edilmeli."
            : "Giderler gelirden yüksek; önce nakit akışı dengelenmeli.",
      explanation:
        `Gelir ${data.monthlyIncome.toFixed(0)} ${currency}, gider ${data.monthlyExpenses.toFixed(0)} ${currency}, net akış ${data.netCashflow.toFixed(0)} ${currency}. Bu yorum kayıtlı finansal verileriniz üzerinden hazırlandı.`,
    },
    insights: [
      {
        title: "Net Nakit Akışı",
        description: data.netCashflow >= 0
          ? `Bu ay ${data.netCashflow.toFixed(0)} ${currency} pozitif nakit akışı var — gelir gideri karşılıyor.`
          : `Bu ay ${Math.abs(data.netCashflow).toFixed(0)} ${currency} açık var — giderler geliri aşıyor.`,
        severity: data.netCashflow >= 0 ? "low" : "high",
      },
      {
        title: "Tasarruf Oranı",
        description: data.savingRate >= 20
          ? `Tasarruf oranı %${data.savingRate.toFixed(1)} — hedef üstünde, iyi durumda.`
          : data.savingRate >= 10
            ? `Tasarruf oranı %${data.savingRate.toFixed(1)} — orta seviyede, artırılabilir.`
            : `Tasarruf oranı %${data.savingRate.toFixed(1)} — düşük, öncelikli olarak artırılmalı.`,
        severity: data.savingRate >= 20 ? "low" : data.savingRate >= 10 ? "medium" : "high",
      },
      {
        title: topCategory ? "En Büyük Gider Alanı" : "Veri Eksikliği",
        description: topCategory
          ? `${topCategory.categoryName} kategorisi ${topCategory.amount.toFixed(0)} ${currency} ile toplam giderin %${topCategory.percent.toFixed(1)}'ini oluşturuyor.`
          : "Kategori bazlı gider verisi olmadığı için ayrıntılı dağılım çıkarılamıyor.",
        severity: topCategory && topCategory.percent > 40 ? "high" : topCategory ? "medium" : "low",
      },
    ],
    recommendations: [
      {
        title: "Haftalık kontrol yap",
        action: "Gelir, gider ve hedef katkısını haftada bir aynı gün kontrol et.",
        estimatedImpact: "Sapmaları erken yakalarsınız.",
        difficulty: "easy" as const,
      },
      {
        title: "En büyük gideri sınırla",
        action: topCategory
          ? `${topCategory.categoryName} için bu ay üst limit belirle ve her harcamayı kaydet.`
          : "Önce giderlerinizi kategoriyle kaydetmeye başlayın.",
        estimatedImpact: "Gider kontrolü artar.",
        difficulty: "medium" as const,
      },
      {
        title: "Hedef katkısını otomatikleştir",
        action: "Net nakit akışınızdan sürdürülebilir bir tutarı hedef hesabına düzenli aktarın.",
        estimatedImpact: "Hedef ilerlemesi düzenli hale gelir.",
        difficulty: "medium" as const,
      },
      {
        title: "Sabit giderleri gözden geçir",
        action: "Fatura, kira, abonelik ve ulaşım gibi tekrar eden giderleri tek listede kontrol edin.",
        estimatedImpact: "Aylık esneklik artar.",
        difficulty: "easy" as const,
      },
    ].slice(0, requestedCount ?? 4),
    numbers: {
      monthlyIncome: data.monthlyIncome,
      monthlyExpense: data.monthlyExpenses,
      estimatedSaving: data.netCashflow > 0 ? data.netCashflow : 0,
      debtLoadRatio: data.debtLoadRatio,
      financialHealthScore: data.healthScore,
    },
    actionItems: [
      {
        title: "Bu haftaki giderleri kontrol et",
        description: "Son 7 gündeki harcamaları kategori kategori işaretle.",
        dueInDays: 3,
        priority: "high" as const,
      },
      {
        title: "Aylık hedef payı seç",
        description: "Net nakit akışından düzenli ayrılacak gerçekçi tutarı belirle.",
        dueInDays: 5,
        priority: "medium" as const,
      },
      {
        title: "Tekrarlayan giderleri listele",
        description: "Fatura, abonelik ve düzenli ödemeleri tek tabloda topla.",
        dueInDays: 7,
        priority: "medium" as const,
      },
    ].slice(0, requestedCount ?? 3),
    chart: data.topExpenseCategories.length
      ? {
          type: "bar",
          title: "En Yüksek Gider Kategorileri",
          unit: currency,
          data: data.topExpenseCategories.slice(0, 5).map((category) => ({
            label: category.categoryName,
            value: category.amount,
          })),
        }
      : undefined,
    followUps: ["Tabloyla göster", "3 aylık plan yap", "Giderlerimde en riskli alan ne?"],
    disclaimer:
      "Bu bilgiler yalnızca genel bilgilendirme amaçlıdır; kişisel finansal yatırım tavsiyesi niteliği taşımaz.",
  };
}

/**
 * Stream-native orchestrator. Yields SSE-ready events so the route layer can
 * forward them directly — no word-by-word simulation, no setTimeout.
 *
 * Flow:
 *   1. Detect intent (quick Gemini call)
 *   2. Build financial context (DB queries)
 *   3. Start Gemini SSE call for the selected agent
 *   4. Stream the "summary" field tokens as `delta` events in real time
 *   5. After full JSON received: parse → format → send remainder as one delta
 *   6. Save conversation + messages to DB
 *   7. Yield `metadata` event with structured response
 *   8. Yield `done`
 */
export async function* orchestrateStream(
  userId: string,
  userMessage: string,
  conversationId?: string,
  forceAgent?: AgentType,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const startTime = Date.now();
  let agentUsed: AgentType = "ExplanationAgent";
  let fallbackInput: AgentInput | undefined;

  try {
    // ── Greeting fast path ──────────────────────────────────────
    if (!forceAgent && isSimpleGreeting(userMessage)) {
      const greetingResponse: AIResponse = {
        summary:
          "Merhaba! Ben FinWise AI, kişisel finans asistanınım. Bütçeniz, harcamalarınız, borçlarınız veya tasarruf hedefleriniz hakkında ne öğrenmek istersiniz?",
        diagnosis: { status: "good", mainIssue: "", explanation: "" },
        insights: [],
        recommendations: [],
        numbers: {},
        actionItems: [],
        followUps: [
          "Bu ay ne kadar harcadım?",
          "Bütçemi nasıl düzenleyebilirim?",
          "Finansal sağlık skorumu göster",
        ],
        disclaimer: "",
      };

      // Stream greeting text character by character (instant — no Gemini call)
      for (const char of greetingResponse.summary) {
        if (signal?.aborted) return;
        yield { type: "delta", text: char };
      }

      if (signal?.aborted) return;

      let activeConvId = conversationId ?? "";
      if (!activeConvId) {
        const conv = await prisma.aIConversation.create({
          data: { userId, title: userMessage.slice(0, 50) },
        });
        activeConvId = conv.id;
      }
      const [, assistantMsg] = await Promise.all([
        prisma.aIMessage.create({ data: { conversationId: activeConvId, role: "USER", content: userMessage } }),
        prisma.aIMessage.create({
          data: {
            conversationId: activeConvId,
            role: "ASSISTANT",
            content: greetingResponse.summary,
            metadataJson: JSON.stringify(greetingResponse),
          },
        }),
      ]);

      yield {
        type: "metadata",
        response: greetingResponse,
        conversationId: activeConvId,
        agentUsed: "ExplanationAgent",
        messageId: assistantMsg.id,
      };
      yield { type: "done" };
      return;
    }

    // ── Conversation context + intent detection + financial context ─
    let conversationCtx: ConversationContext | undefined;
    if (conversationId) {
      conversationCtx = await loadConversationContext(conversationId).catch(() => undefined);
    }
    if (signal?.aborted) return;

    const intent: ExtendedIntent = forceAgent
      ? (forceAgent as ExtendedIntent)
      : await detectIntent(userMessage, conversationCtx);
    agentUsed = intentToAgentType(intent);
    if (signal?.aborted) return;

    const financialData = await buildFinancialContext(userId);
    if (signal?.aborted) return;

    const agentInput: AgentInput = { userId, userMessage, financialData, conversationContext: conversationCtx };
    fallbackInput = agentInput;

    // ── Yeni intentler ve detaylı analiz isteyen sorular için directMetric'i atla ─
    const skipDirectMetric: ExtendedIntent[] = [
      "income_expense_balance", "table_format", "explain_previous",
      "monthly_action_plan", "budget_overrun", "spending_risk", "debt_analysis",
      "FinancialHealthAgent", "GoalPlannerAgent", "DebtRiskAgent", "BudgetPlannerAgent",
    ];

    const directMetricResponse = skipDirectMetric.includes(intent)
      ? null
      : buildDirectMetricResponse(agentInput);

    if (directMetricResponse) {
      const assistantContent = formatCompactAssistantContent(directMetricResponse, "SpendingAnalysisAgent");
      if (assistantContent.trim()) yield { type: "delta", text: assistantContent };

      const durationMs = Date.now() - startTime;
      let activeConvId = conversationId ?? "";
      if (!activeConvId) {
        const conv = await prisma.aIConversation.create({
          data: { userId, title: userMessage.slice(0, 50) },
        });
        activeConvId = conv.id;
      }

      const [, assistantMsg] = await Promise.all([
        prisma.aIMessage.create({
          data: { conversationId: activeConvId, role: "USER", content: userMessage },
        }),
        prisma.aIMessage.create({
          data: {
            conversationId: activeConvId,
            role: "ASSISTANT",
            content: assistantContent,
            metadataJson: JSON.stringify(directMetricResponse),
          },
        }),
      ]);

      await prisma.aIAnalysis.create({
        data: {
          userId,
          type: "SpendingAnalysisAgent",
          inputJson: JSON.stringify({ userMessage, financialContext: financialData, mode: "directMetric" }),
          outputJson: JSON.stringify(directMetricResponse),
          durationMs,
        },
      }).catch(() => {});

      yield {
        type: "metadata",
        response: directMetricResponse,
        conversationId: activeConvId,
        agentUsed: "SpendingAnalysisAgent",
        messageId: assistantMsg.id,
      };
      yield { type: "done" };
      return;
    }

    let prompt = "";
    let agentSystemPrompt = "";
    let isActionPlan = false;
    let healthScoreBreakdown:
      | {
          score: number;
          incomeExpenseRatio: number;
          savingRate: number;
          debtLoad: number;
          spendingDiscipline: number;
          goalProgress: number;
        }
      | undefined;

    // intent bazlı prompt seçimi (ExtendedIntent → prompt)
    switch (intent) {
      case "income_expense_balance": {
        const p = buildIncomeExpenseBalancePrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "table_format": {
        const p = buildTableFormatPrompt(agentInput, conversationCtx);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "explain_previous": {
        const p = buildExplainPreviousPrompt(agentInput, conversationCtx);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "monthly_action_plan": {
        const p = buildMonthlyActionPlanPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "budget_overrun": {
        const p = buildBudgetOverrunPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "BudgetPlannerAgent": {
        const p = buildBudgetPlannerPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "spending_risk":
      case "SpendingAnalysisAgent": {
        const p = buildSpendingAnalysisPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "debt_analysis":
      case "DebtRiskAgent": {
        const p = intent === "debt_analysis"
          ? buildDebtAnalysisPrompt(agentInput)
          : buildDebtRiskPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "GoalPlannerAgent": {
        const p = buildGoalPlannerPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "SubscriptionWasteAgent": {
        const p = buildSubscriptionWastePrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "FinancialHealthAgent": {
        const latestScore = await prisma.financialHealthScore.findFirst({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        if (signal?.aborted) return;
        const scoreBreakdown = resolveHealthScoreBreakdown(financialData, latestScore);
        healthScoreBreakdown = scoreBreakdown;
        const p = buildFinancialHealthPrompt(agentInput, scoreBreakdown);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      case "ActionPlanAgent": {
        const p = buildActionPlanPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        isActionPlan = true;
        break;
      }
      case "ExplanationAgent": {
        const p = buildExplanationPrompt(userMessage);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        break;
      }
      default: {
        const p = buildSpendingAnalysisPrompt(agentInput);
        prompt = p.prompt; agentSystemPrompt = p.systemPrompt;
        agentUsed = "SpendingAnalysisAgent";
        break;
      }
    }

    // ── Stream Gemini response, extract summary in real time ─────
    let accumulated = "";

    for await (const chunk of streamAIJSONChunks(prompt, agentSystemPrompt, {}, signal)) {
      if (signal?.aborted) return;
      accumulated += chunk;
    }

    if (signal?.aborted) return;

    // ── Parse full JSON and stream remainder ─────────────────────
    let parsedResponse: AIResponse;
    try {
      const rawResult = JSON.parse(cleanJSONText(accumulated)) as unknown;

      if (isActionPlan) {
        const planParsed = ActionPlanOutputSchema.safeParse(rawResult);
        if (!planParsed.success) throw new Error("Aksiyon planı doğrulanamadı.");
        parsedResponse = convertActionPlanToAIResponse(planParsed.data, extractRequestedItemCount(userMessage));
      } else {
        const responseParsed = AIResponseSchema.safeParse(rawResult);
        if (!responseParsed.success) throw new Error("AI yanıtı doğrulanamadı.");
        parsedResponse = responseParsed.data;
      }
    } catch {
      if (agentUsed === "FinancialHealthAgent" && healthScoreBreakdown) {
        parsedResponse = buildFinancialHealthFallbackResponse(agentInput, healthScoreBreakdown);
      } else {
        parsedResponse = buildDeterministicFallbackResponse(agentInput, agentUsed);
      }
    }

    parsedResponse = sanitizeAIResponseWithFinancialData(parsedResponse, financialData, agentUsed, userMessage);

    const assistantContent = formatCompactAssistantContent(parsedResponse, agentUsed);
    if (assistantContent.trim()) {
      yield { type: "delta", text: assistantContent };
    }

    // ── Persist conversation + messages ──────────────────────────
    const durationMs = Date.now() - startTime;
    let activeConvId = conversationId ?? "";
    if (!activeConvId) {
      const conv = await prisma.aIConversation.create({
        data: { userId, title: userMessage.slice(0, 50) },
      });
      activeConvId = conv.id;
    }

    const [, assistantMsg] = await Promise.all([
      prisma.aIMessage.create({
        data: { conversationId: activeConvId, role: "USER", content: userMessage },
      }),
      prisma.aIMessage.create({
        data: {
          conversationId: activeConvId,
          role: "ASSISTANT",
          content: assistantContent,
          metadataJson: JSON.stringify(parsedResponse),
        },
      }),
    ]);

    await prisma.aIAnalysis.create({
      data: {
        userId,
        type: agentUsed,
        inputJson: JSON.stringify({ userMessage, financialContext: financialData }),
        outputJson: JSON.stringify(parsedResponse),
        durationMs,
      },
    }).catch(() => {});

    yield {
      type: "metadata",
      response: parsedResponse,
      conversationId: activeConvId,
      agentUsed,
      messageId: assistantMsg.id,
    };
  } catch (error) {
    if (signal?.aborted) return;

    if (fallbackInput) {
      let fallbackResponse = buildDeterministicFallbackResponse(fallbackInput, agentUsed);
      fallbackResponse = sanitizeAIResponseWithFinancialData(fallbackResponse, fallbackInput.financialData, agentUsed, userMessage);
      const assistantContent = formatCompactAssistantContent(fallbackResponse, agentUsed);
      let activeConvId = conversationId ?? "";

      if (!activeConvId) {
        const conv = await prisma.aIConversation.create({
          data: { userId, title: userMessage.slice(0, 50) },
        });
        activeConvId = conv.id;
      }

      const [, assistantMsg] = await Promise.all([
        prisma.aIMessage.create({
          data: { conversationId: activeConvId, role: "USER", content: userMessage },
        }),
        prisma.aIMessage.create({
          data: {
            conversationId: activeConvId,
            role: "ASSISTANT",
            content: assistantContent,
            metadataJson: JSON.stringify(fallbackResponse),
          },
        }),
      ]);

      await prisma.aIAnalysis.create({
        data: {
          userId,
          type: agentUsed,
          inputJson: JSON.stringify({ userMessage, financialContext: fallbackInput.financialData }),
          outputJson: JSON.stringify(fallbackResponse),
          isError: true,
          errorMessage: error instanceof Error ? error.message : "Bilinmeyen hata",
          durationMs: Date.now() - startTime,
        },
      }).catch(() => {});

      yield { type: "delta", text: assistantContent };
      yield {
        type: "metadata",
        response: fallbackResponse,
        conversationId: activeConvId,
        agentUsed,
        messageId: assistantMsg.id,
      };
      yield { type: "done" };
      return;
    }

    await prisma.aIAnalysis.create({
      data: {
        userId,
        type: agentUsed,
        inputJson: JSON.stringify({ userMessage }),
        isError: true,
        errorMessage: error instanceof Error ? error.message : "Bilinmeyen hata",
        durationMs: Date.now() - startTime,
      },
    }).catch(() => {});

    yield {
      type: "error",
      text: "Bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  yield { type: "done" };
}
