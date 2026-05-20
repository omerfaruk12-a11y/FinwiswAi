"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Lightbulb, ClipboardList, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIResponse } from "@/lib/ai/schemas";
import { InlineChart } from "./inline-chart";
import { AIResultActions } from "./ai-result-actions";
import { AnimatedStreamText } from "./animated-stream-text";

function severityDot(severity: "low" | "medium" | "high") {
  return severity === "high"
    ? "bg-red-500 shadow-red-200"
    : severity === "medium"
    ? "bg-amber-500 shadow-amber-200"
    : "bg-emerald-500 shadow-emerald-200";
}

function severityBadge(severity: "low" | "medium" | "high") {
  return severity === "high"
    ? "bg-red-50 text-red-700 border-red-200"
    : severity === "medium"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
}

interface MessageContentProps {
  content: string;
  response?: AIResponse;
  isStreaming?: boolean;
  agentUsed?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.25, ease: "easeOut" },
  }),
};

export function MessageContent({ content, response, isStreaming, agentUsed }: MessageContentProps) {
  // Tablo yanıtlarını (summary | ile başlıyorsa veya | --- | içeriyorsa) sadece metin olarak göster
  const summaryIsTable = !!response?.summary && /\|[-: ]+\|/.test(response.summary);
  const showCards = !isStreaming && response && !summaryIsTable;
  const fullAnalysisAgents = new Set([
    "FinancialHealthAgent",
    "ReportAgent",
    "ExplanationAgent",
    "SpendingAnalysisAgent",
    "BudgetPlannerAgent",
    "GoalPlannerAgent",
    "DebtRiskAgent",
    "SubscriptionWasteAgent",
  ]);
  const isFullAnalysis = !!agentUsed && fullAnalysisAgents.has(agentUsed);
  const isActionPlan = agentUsed === "ActionPlanAgent";
  // Monthly plan has dueInDays 30/60/90; weekly plan has 3/5/7
  const isMonthlyPlan = isActionPlan && (response?.actionItems?.[0]?.dueInDays ?? 0) > 14;
  const showDiagnosis = showCards && isFullAnalysis && response.diagnosis.explanation;
  const showInsights = showCards && (isFullAnalysis || isMonthlyPlan) && response.insights.length > 0;
  const showChart = showCards && isFullAnalysis && response.chart;
  const showRecommendations = showCards && (isFullAnalysis || isMonthlyPlan) && response.recommendations.length > 0;
  const showActionItems = showCards && isActionPlan && response.actionItems.length > 0;
  const showResultActions = showCards && isFullAnalysis;

  return (
    <div className="space-y-3">
      {/* Main text — animated during stream, formatted markdown when done */}
      <AnimatedStreamText content={content} isStreaming={isStreaming} />

      {/* Diagnosis */}
      {showDiagnosis && (
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Değerlendirme
            </span>
          </div>
          <div className="px-3 py-2.5">
            {response.diagnosis.mainIssue && (
              <p className="text-xs font-semibold text-slate-800">{response.diagnosis.mainIssue}</p>
            )}
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {response.diagnosis.explanation}
            </p>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      {showInsights && (
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              İçgörüler
            </span>
          </div>
          <ul className="divide-y divide-slate-50">
            {response.insights.slice(0, 5).map((ins, i) => (
              <motion.li
                key={i}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-3 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "mt-1.5 w-2 h-2 rounded-full shrink-0 shadow-sm",
                    severityDot(ins.severity),
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800">{ins.title}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                        severityBadge(ins.severity),
                      )}
                    >
                      {ins.severity === "high"
                        ? "Yüksek"
                        : ins.severity === "medium"
                        ? "Orta"
                        : "Düşük"}
                    </span>
                  </div>
                  {ins.description && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {ins.description}
                    </p>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Inline chart */}
      {showChart && (
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <InlineChart chart={response.chart!} />
        </motion.div>
      )}

      {/* Recommendations */}
      {showRecommendations && (
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50/80 border-b border-emerald-100">
            <ClipboardList className="w-3.5 h-3.5 text-[#059669]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
              Önerilen Adımlar
            </span>
          </div>
          <ol className="divide-y divide-emerald-50/60">
            {response.recommendations.slice(0, 5).map((rec, i) => (
              <motion.li
                key={i}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-3 px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white shadow-sm shadow-emerald-200">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800">{rec.title}</p>
                  {rec.action && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{rec.action}</p>
                  )}
                  {rec.estimatedImpact && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-[#059669] font-medium">
                      <TrendingUp className="w-3 h-3" />
                      {rec.estimatedImpact}
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* Action items */}
      {showActionItems && (
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-white shadow-sm overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/80 border-b border-blue-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              {isMonthlyPlan ? "Aylık Eylem Planı" : "Bu Hafta Yapılacaklar"}
            </span>
          </div>
          <ol className="divide-y divide-blue-50/70">
            {response.actionItems.slice(0, 5).map((item, i) => (
              <motion.li
                key={i}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-start gap-3 px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm shadow-blue-200">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                    <span className="rounded-full border border-blue-100 bg-white px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      {item.dueInDays} gün
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      )}

      {showResultActions && <AIResultActions response={response} />}
    </div>
  );
}
