// AI Çıktı Şemaları - Tüm AI yanıtları bu şemalarla validate edilir.

import { z } from "zod";

export const AIInsightSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
});

export const AIRecommendationSchema = z.object({
  title: z.string().min(1),
  action: z.string().min(1),
  estimatedImpact: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const AIActionItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  dueInDays: z.number().optional(),
  priority: z.enum(["low", "medium", "high"]),
});

export const AIChartDataPointSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const AIChartSchema = z.object({
  type: z.enum(["bar", "line", "pie"]),
  title: z.string(),
  data: z.array(AIChartDataPointSchema).min(1),
  unit: z.string().optional(), // e.g. "₺" or "%"
});

export const AIResponseSchema = z.object({
  summary: z.string().min(1),
  chart: AIChartSchema.optional(),
  diagnosis: z.object({
    status: z.enum(["good", "warning", "risk"]),
    mainIssue: z.string().min(1),
    explanation: z.string().min(1),
  }),
  insights: z.array(AIInsightSchema),
  recommendations: z.array(AIRecommendationSchema),
  numbers: z.object({
    monthlyIncome: z.number().optional(),
    monthlyExpense: z.number().optional(),
    estimatedSaving: z.number().optional(),
    requiredSavingForGoal: z.number().optional(),
    debtLoadRatio: z.number().optional(),
    financialHealthScore: z.number().optional(),
  }),
  actionItems: z.array(AIActionItemSchema),
  followUps: z.array(z.string()).optional(),
  disclaimer: z.string().min(1),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;
export type AIInsight = z.infer<typeof AIInsightSchema>;
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;
export type AIActionItem = z.infer<typeof AIActionItemSchema>;
export type AIChart = z.infer<typeof AIChartSchema>;

export const IncomeAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  diagnosis: z.object({
    status: z.enum(["good", "warning", "risk"]),
    mainIssue: z.string().min(1),
    explanation: z.string().min(1),
  }),
  insights: z.array(AIInsightSchema).min(1),
  recommendations: z.array(AIRecommendationSchema).min(1),
  numbers: z.object({
    monthlyIncome: z.number().optional(),
    recurringIncome: z.number().optional(),
    oneTimeIncome: z.number().optional(),
    averageMonthlyIncome: z.number().optional(),
    monthlyGrowthRate: z.number().optional(),
    topIncomeShare: z.number().optional(),
  }),
  actionItems: z.array(AIActionItemSchema),
  chart: AIChartSchema.optional(),
  followUps: z.array(z.string()).optional(),
  disclaimer: z.string().min(1),
});

export type IncomeAnalysisOutput = z.infer<typeof IncomeAnalysisOutputSchema>;

export const ActionPlanOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  items: z.array(z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    category: z.string(),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    dueInDays: z.number().optional(),
  })).min(1),
});

export type ActionPlanOutput = z.infer<typeof ActionPlanOutputSchema>;

export const BudgetPlanOutputSchema = z.object({
  summary: z.string().min(1),
  totalPlannedExpense: z.number(),
  plannedSaving: z.number(),
  categories: z.array(z.object({
    categoryId: z.string(),
    categoryName: z.string(),
    plannedAmount: z.number(),
    reasoning: z.string(),
  })).min(1),
  tips: z.array(z.string()),
});

export type BudgetPlanOutput = z.infer<typeof BudgetPlanOutputSchema>;

export const ReportOutputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  highlights: z.array(z.string()).min(1),
  keyInsights: z.array(AIInsightSchema).min(1),
  recommendations: z.array(AIRecommendationSchema).min(1),
  nextPeriodGoals: z.array(z.string()),
  disclaimer: z.string().min(1),
});

export type ReportOutput = z.infer<typeof ReportOutputSchema>;
