"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowUp,
  CheckCircle2,
  Info,
  Paperclip,
  Square,
  PanelLeftOpen,
  PanelLeftClose,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OwlIcon } from "@/components/brand/owl-icon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShiningText } from "@/components/ui/shining-text";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input";
import type { AIResponse } from "@/lib/ai/schemas";
import type { AgentType } from "@/lib/ai/orchestrator";
import { AssistantEmptyState } from "./_components/empty-state";
import { AssistantSidebar, type OverviewStats } from "./_components/sidebar-cards";
import { MessageContent } from "./_components/message-content";
import { MessageActions } from "./_components/message-actions";
import { AgentBadge } from "./_components/agent-badge";
import { AGENT_META, getAgentMeta } from "./_components/agent-config";
import { SlashCommandPopover } from "./_components/slash-command-popover";
import { FollowUpChips } from "./_components/follow-up-chips";
import {
  ConversationList,
  type ConversationSummary,
} from "./_components/conversation-list";

type Message =
  | { id: string; role: "USER"; content: string; time: string }
  | {
      id: string;
      role: "ASSISTANT";
      content: string;
      time: string;
      response?: AIResponse;
      dbMessageId?: string;
      isStreaming?: boolean;
      agentUsed?: string;
      isLocalFormatMessage?: boolean;
    }
  | { id: string; role: "TYPING"; time: string };

type OverviewApiData = {
  stats: OverviewStats;
  changes: { incomeChange: number; expenseChange: number };
  topCategories: Array<{ name: string; amount: number }>;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function normalizeCommandText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
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

function isTableFollowUpCommand(value: string): boolean {
  const normalized = normalizeCommandText(value);
  // Pre-normalized list (same normalizeCommandText rules applied)
  return [
    "tablo",
    "tabloyla goster",
    "tablo halinde goster",
    "tablo olarak goster",
    "tablo goster",
    "bunu tabloyla goster",
    "bunu tabloya cevir",
    "bunu tablo olarak goster",
    "tabloya cevir",
    "tabloya donustur",
  ].includes(normalized);
}

function escapeTableCell(value: string | number | null | undefined): string {
  return String(value ?? "-").replace(/\|/g, "\\|").replace(/\r?\n+/g, " ").trim();
}


function buildTableResponse(response: AIResponse): string {
  const nums = response.numbers;
  const income = nums.monthlyIncome ?? 0;
  const expense = nums.monthlyExpense ?? 0;
  const saving = nums.estimatedSaving ?? 0;
  const netCash = income - expense;
  const savingRate = income > 0 ? (saving / income) * 100 : 0;
  const healthScore = nums.financialHealthScore;
  const debtRatio = nums.debtLoadRatio;

  const fmt = (v: number) => new Intl.NumberFormat("tr-TR").format(Math.round(v)) + " ₺";
  const esc = escapeTableCell;

  const cashStatus = netCash >= 0 ? "Pozitif ✓" : "Negatif ✗";
  const savRateStatus = savingRate >= 20 ? "İyi ✓" : savingRate >= 10 ? "Orta ↗" : "Düşük ✗";
  const debtStatus =
    debtRatio != null
      ? debtRatio > 35
        ? "Yüksek Risk ✗"
        : debtRatio > 20
        ? "Dikkat ↗"
        : "Kontrollü ✓"
      : null;
  const scoreStatus =
    healthScore != null
      ? healthScore >= 80
        ? "Güçlü ✓"
        : healthScore >= 60
        ? "Orta ↗"
        : "Düşük ✗"
      : null;

  // Yalnızca harcama kategorisi chartlarından en büyük gideri al (skor bileşeni chartı değil)
  const isExpenseChart = response.chart?.title?.toLowerCase().includes("gider");
  const topCat = isExpenseChart ? response.chart?.data?.[0] : undefined;

  const rows: string[] = [];
  if (income > 0) rows.push(`| Aylık Gelir | ${fmt(income)} | Güçlü ✓ |`);
  if (expense > 0)
    rows.push(`| Aylık Gider | ${fmt(expense)} | ${expense / income > 0.8 ? "Yüksek ↗" : "Kontrollü ✓"} |`);
  if (income > 0) rows.push(`| Net Nakit Akışı | ${fmt(netCash)} | ${cashStatus} |`);
  if (income > 0) rows.push(`| Tasarruf Oranı | %${savingRate.toFixed(1)} | ${savRateStatus} |`);
  if (topCat) rows.push(`| En Büyük Gider Kategorisi | ${esc(topCat.label)} | ${fmt(topCat.value)} |`);
  if (debtStatus) rows.push(`| Borç Yükü | %${debtRatio!.toFixed(1)} | ${debtStatus} |`);
  if (scoreStatus) rows.push(`| Finansal Sağlık Skoru | ${healthScore}/100 | ${scoreStatus} |`);

  const sections: string[] = [];
  if (rows.length > 0) {
    sections.push(["| Alan | Değer | Durum |", "| --- | --- | --- |", ...rows].join("\n"));
  }

  const recRows = response.recommendations
    .slice(0, 3)
    .map((r) => `| ${esc(r.title)} | ${esc(r.action ?? "")} |`);
  if (recRows.length > 0) {
    sections.push(
      ["### Öncelikli Aksiyonlar", "| Başlık | Yapılacak |", "| --- | --- |", ...recRows].join("\n"),
    );
  }

  return sections.join("\n\n");
}

async function readSSEStream(
  response: Response,
  onDelta: (text: string) => void,
  onMetadata: (data: {
    response: AIResponse;
    conversationId: string;
    agentUsed: string;
    messageId: string;
  }) => void,
  onError: (text: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No body");
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split("\n\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      try {
        const parsed = JSON.parse(trimmed.slice(6));
        if (parsed.type === "delta") onDelta(parsed.text);
        else if (parsed.type === "metadata") onMetadata(parsed);
        else if (parsed.type === "error") onError(parsed.text);
      } catch {
        // ignore malformed lines
      }
    }
  }
}

function AssistantPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [overview, setOverview] = React.useState<OverviewApiData | null>(null);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [latestResponse, setLatestResponse] = React.useState<AIResponse | null>(null);
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);

  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [convLoading, setConvLoading] = React.useState(true);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashQuery, setSlashQuery] = React.useState("");
  const [pendingAgent, setPendingAgent] = React.useState<AgentType | undefined>();

  const [activeConversationId, setActiveConversationId] = React.useState<string | undefined>();
  const conversationIdRef = React.useRef<string | undefined>(undefined);
  const lastUserMessageRef = React.useRef<string>("");
  const latestResponseRef = React.useRef<AIResponse | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const textareaContainerRef = React.useRef<HTMLDivElement>(null);

  // Initial data fetch
  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/analytics/overview").then((r) => r.json()).catch(() => null),
      fetch("/api/user/me").then((r) => r.json()).catch(() => null),
      fetch("/api/conversations").then((r) => r.json()).catch(() => null),
    ]).then(([oRes, uRes, cRes]) => {
      if (!active) return;
      if (oRes?.success) setOverview(oRes.data);
      if (uRes?.success) setUserName(uRes.data?.name ?? null);
      if (cRes?.success) setConversations(cRes.data);
      setConvLoading(false);
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    latestResponseRef.current = latestResponse;
  }, [latestResponse]);

  // Load conversation from URL param
  React.useEffect(() => {
    const cId = searchParams.get("c");
    if (!cId || cId === conversationIdRef.current) return;
    loadConversation(cId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  React.useEffect(() => {
    const hasStreamingMessage = messages.some(
      (message) => message.role === "ASSISTANT" && message.isStreaming,
    );
    messagesEndRef.current?.scrollIntoView({
      behavior: hasStreamingMessage ? "auto" : "smooth",
      block: "end",
    });
  }, [messages]);

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      if (!json.success) return;

      conversationIdRef.current = id;
      setActiveConversationId(id);
      const loaded: Message[] = json.data.map(
        (m: { id: string; role: string; content: string; metadata: AIResponse | null; createdAt: string }) => {
          const time = new Date(m.createdAt).toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          if (m.role === "USER") {
            return { id: m.id, role: "USER" as const, content: m.content, time };
          }
          return {
            id: m.id,
            role: "ASSISTANT" as const,
            content: m.content,
            time,
            response: m.metadata ?? undefined,
            dbMessageId: m.id,
          };
        },
      );
      setMessages(loaded);

      // Set sidebar from last AI response
      const lastAI = [...loaded].reverse().find((m) => m.role === "ASSISTANT");
      if (lastAI?.role === "ASSISTANT" && lastAI.response) {
        setLatestResponse(lastAI.response);
      }
    } catch {
      toast.error("Konuşma yüklenemedi.");
    }
  };

  const refreshConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const json = await res.json();
      if (json.success) setConversations(json.data);
    } catch {
      toast.error("Konuşma geçmişi yüklenemedi.");
    }
  };

  const handleNew = () => {
    conversationIdRef.current = undefined;
    setActiveConversationId(undefined);
    setMessages([]);
    setLatestResponse(null);
    router.push("/app/assistant");
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/app/assistant?c=${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (conversationIdRef.current === id) handleNew();
    } catch {
      toast.error("Konuşma silinirken bir sorun oluştu.");
    }
  };

  const handleRenameConversation = async (id: string, title: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      );
    } catch {
      toast.error("Konuşma adı güncellenemedi.");
    }
  };

  const handleSend = React.useCallback(
    async (text?: string, isRegenerate = false, forceAgent?: AgentType) => {
      let messageText = (text ?? input).trim();
      if (!messageText || isLoading) return;
      const commandMatch = AGENT_META.find((meta) =>
        messageText === meta.slashCommand || messageText.startsWith(`${meta.slashCommand} `),
      );
      if (commandMatch) {
        messageText = messageText.slice(commandMatch.slashCommand.length).trim() || commandMatch.hint;
      }
      const agentOverride = forceAgent ?? pendingAgent ?? commandMatch?.agent;
      const tableResponse = !forceAgent && !isRegenerate && isTableFollowUpCommand(messageText)
        ? latestResponseRef.current
        : null;
      const filesToSend = isRegenerate ? [] : attachedFiles;
      setPendingAgent(undefined);

      lastUserMessageRef.current = messageText;

      if (tableResponse) {
        const now = new Date();
        const time = formatTime(now);
        const userMsg: Message = {
          id: `u-${Date.now()}`,
          role: "USER",
          content: messageText,
          time,
        };
        const assistantMsg: Message = {
          id: `a-${Date.now()}`,
          role: "ASSISTANT",
          content: buildTableResponse(tableResponse),
          time,
          isLocalFormatMessage: true,
        };
        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput("");
        setAttachedFiles([]);
        if (uploadInputRef.current) uploadInputRef.current.value = "";
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const time = formatTime(now);
      const streamingId = `a-${Date.now()}`;

      if (!isRegenerate) {
        const userMsg: Message = {
          id: `u-${Date.now()}`,
          role: "USER",
          content: messageText,
          time,
        };
        setMessages((prev) => [
          ...prev,
          userMsg,
          { id: streamingId, role: "ASSISTANT", content: "", time, isStreaming: true },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: streamingId, role: "ASSISTANT", content: "", time, isStreaming: true },
        ]);
      }

      setInput("");
      setAttachedFiles([]);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      setIsLoading(true);

      abortRef.current = new AbortController();

      try {
        let fetchBody: BodyInit;
        let fetchHeaders: Record<string, string> = {};

        if (filesToSend.length > 0) {
          const fd = new FormData();
          fd.append("message", messageText);
          if (conversationIdRef.current) fd.append("conversationId", conversationIdRef.current);
          if (agentOverride) fd.append("forceAgent", agentOverride);
          filesToSend.forEach((f) => fd.append("files", f));
          fetchBody = fd;
          // Don't set Content-Type for FormData; the browser sets the boundary.
        } else {
          fetchHeaders = { "Content-Type": "application/json" };
          fetchBody = JSON.stringify({
            message: messageText,
            conversationId: conversationIdRef.current,
            ...(agentOverride ? { forceAgent: agentOverride } : {}),
          });
        }

        const res = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: fetchHeaders,
          body: fetchBody,
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          let message = "Stream request failed";
          try {
            const errorJson = await res.json();
            message = errorJson?.error?.message ?? errorJson?.message ?? message;
          } catch {
            const errorText = await res.text().catch(() => "");
            if (errorText) message = errorText;
          }
          throw new Error(message);
        }

        let fullText = "";
        let finalResponse: AIResponse | undefined;
        let finalConvId: string | undefined;
        let finalMsgId: string | undefined;
        let finalAgentUsed: string | undefined;

        const updateStreamingMessage = (content: string) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? { ...m, role: "ASSISTANT" as const, content, isStreaming: true }
              : m,
            ),
          );
        };

        await readSSEStream(
          res,
          (delta) => {
            fullText += delta;
            updateStreamingMessage(fullText);
          },
          (meta) => {
            finalResponse = meta.response;
            finalConvId = meta.conversationId;
            finalMsgId = meta.messageId;
            finalAgentUsed = meta.agentUsed;
          },
          (errorText) => {
            if (!fullText.trim()) {
              fullText = errorText;
              updateStreamingMessage(fullText);
            }
          },
        );

        if (finalConvId && finalConvId !== conversationIdRef.current) {
          conversationIdRef.current = finalConvId;
          setActiveConversationId(finalConvId);
          router.push(`/app/assistant?c=${finalConvId}`, { scroll: false });
          // Auto-generate title in background
          fetch(`/api/conversations/${finalConvId}/title`, { method: "POST" })
            .then(() => refreshConversations())
            .catch(() => {});
        } else {
          refreshConversations();
        }

        if (finalResponse) setLatestResponse(finalResponse);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? {
                  ...m,
                  role: "ASSISTANT" as const,
                  content: finalResponse?.summary || fullText || "Yanıt alınamadı.",
                  time: formatTime(new Date()),
                  response: finalResponse,
                  dbMessageId: finalMsgId,
                  agentUsed: finalAgentUsed ?? undefined,
                  isStreaming: false,
                }
              : m,
          ),
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? m.role === "ASSISTANT"
                  ? {
                      ...m,
                      content: `${m.content} [Durduruldu]`,
                      isStreaming: false,
                    }
                  : {
                      id: m.id,
                      role: "ASSISTANT" as const,
                      content: "[İptal Edildi]",
                      time: formatTime(new Date()),
                      isStreaming: false,
                    }
                : m,
            ),
          );
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId
                ? {
                    ...m,
                    role: "ASSISTANT" as const,
                    content:
                      m.role === "ASSISTANT" && "content" in m && m.content
                        ? m.content
                        : "Bir hata oluştu. Lütfen tekrar deneyin.",
                    time: formatTime(new Date()),
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [attachedFiles, input, isLoading, router, pendingAgent],
  );

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleRegenerate = React.useCallback(() => {
    const lastUser = lastUserMessageRef.current;
    if (!lastUser) return;
    setMessages((prev) => {
      const lastAI = [...prev].reverse().findIndex((m) => m.role === "ASSISTANT");
      if (lastAI === -1) return prev;
      const idx = prev.length - 1 - lastAI;
      return prev.filter((_, i) => i !== idx);
    });
    handleSend(lastUser, true);
  }, [handleSend]);

  const overviewSummary = overview
    ? {
        monthlyExpenses: overview.stats.monthlyExpenses,
        monthlyIncome: overview.stats.monthlyIncome,
        netCashflow: overview.stats.netCashflow,
        debtLoadRatio: overview.stats.debtLoadRatio,
        healthScore: overview.stats.healthScore,
        expenseChange: overview.changes?.expenseChange ?? 0,
        topCategoryName: overview.topCategories?.[0]?.name,
        topCategoryAmount: overview.topCategories?.[0]?.amount,
      }
    : null;

  const hasMessages = messages.length > 0;
  const pendingAgentMeta = pendingAgent ? getAgentMeta(pendingAgent) : undefined;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden pb-8 font-sans text-slate-900">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">AI Finans Asistanı</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gelir, gider, borç ve hedeflerine göre kişisel finans yorumları al.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          title={sidebarOpen ? "Geçmişi gizle" : "Geçmişi göster"}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Geçmiş</span>
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 xl:min-h-[600px] xl:flex-row">
        {/* Left: Conversation history */}
        {sidebarOpen && (
          <div className="order-2 flex h-72 w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:order-none xl:h-auto xl:w-[260px]">
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={handleSelectConversation}
              onNew={handleNew}
              onDelete={handleDeleteConversation}
              onRename={handleRenameConversation}
              loading={convLoading}
            />
          </div>
        )}

        {/* Center: Chat */}
        <div className="order-1 flex min-h-[540px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:order-none xl:min-h-0">
          <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <h2 className="text-sm font-bold text-slate-900">FinWise AI ile konuş</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Yatırım tavsiyesi vermez; bütçe ve finansal farkındalık sağlar.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
            {!hasMessages ? (
              <div className="h-full flex items-center justify-center">
                <AssistantEmptyState
                  userName={userName}
                  overview={overviewSummary}
                  onPick={(t) => handleSend(t)}
                  disabled={isLoading}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => {
                  if (msg.role === "TYPING") {
                    return (
                      <div key={msg.id} className="flex justify-start">
                        <div className="flex gap-3 max-w-[85%] flex-row">
                          <OwlIcon contained pulsing />
                          <div className="p-3.5 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm flex items-center gap-1.5 h-[46px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" />
                            <div
                              className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <div
                              className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full",
                        msg.role === "USER" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "flex gap-3 max-w-[88%] sm:max-w-[78%]",
                          msg.role === "USER" ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {msg.role === "ASSISTANT" && (
                          <OwlIcon contained pulsing={msg.role === "ASSISTANT" && msg.isStreaming} />
                        )}

                        <div className={cn("flex flex-col gap-1 min-w-0 group")}>
                          {/* Agent badge above assistant bubble */}
                          {msg.role === "ASSISTANT" && msg.agentUsed && !msg.isStreaming && !msg.isLocalFormatMessage && (
                            <AgentBadge agentUsed={msg.agentUsed} className="self-start mb-1" />
                          )}

                          <div
                            className={cn(
                              "p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                              msg.role === "USER"
                                ? "bg-[#ECFDF5] text-slate-800 rounded-tr-sm border border-green-100"
                                : "bg-white text-slate-700 rounded-tl-sm border border-slate-200 shadow-sm",
                            )}
                          >
                            {msg.role === "USER" ? (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : msg.isStreaming && !msg.content ? (
                              <ShiningText
                                text="FinWise AI düşünüyor..."
                                className="text-sm font-semibold"
                              />
                            ) : (
                              <MessageContent
                                content={msg.content}
                                response={msg.response}
                                isStreaming={msg.isStreaming}
                                agentUsed={msg.agentUsed}
                              />
                            )}
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-2",
                              msg.role === "USER" ? "justify-end" : "justify-start",
                            )}
                          >
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              {msg.time}{" "}
                              {msg.role === "USER" && (
                                <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                              )}
                            </span>
                            {msg.role === "ASSISTANT" && !msg.isStreaming && !msg.isLocalFormatMessage && (
                              <MessageActions
                                content={msg.content}
                                messageId={msg.dbMessageId}
                                onRegenerate={handleRegenerate}
                                disabled={isLoading}
                              />
                            )}
                          </div>

                          {/* Follow-up chips below last assistant message */}
                          {msg.role === "ASSISTANT" &&
                            !msg.isStreaming &&
                            !msg.isLocalFormatMessage &&
                            msg.id === [...messages].reverse().find((m) => m.role === "ASSISTANT")?.id && (
                              <FollowUpChips
                                followUps={msg.response?.followUps}
                                onSelect={(t) => handleSend(t)}
                                disabled={isLoading}
                              />
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-4 sm:p-6">
            <div ref={textareaContainerRef} className="relative">
              <SlashCommandPopover
                open={slashOpen}
                query={slashQuery}
                onSelect={(agent, hint) => {
                  setPendingAgent(agent);
                  setSlashOpen(false);
                  setSlashQuery("");
                  setInput(hint);
                }}
                onClose={() => { setSlashOpen(false); setSlashQuery(""); }}
                anchorRef={textareaContainerRef as React.RefObject<HTMLElement>}
              />
              <PromptInput
                value={input}
                onValueChange={(value) => {
                  const sliced = value.slice(0, 500);
                  setInput(sliced);
                  const slashMatch = sliced.match(/^\/(\S*)$/);
                  if (slashMatch) {
                    setSlashOpen(true);
                    setSlashQuery(slashMatch[1]);
                  } else {
                    setSlashOpen(false);
                    setSlashQuery("");
                    if (!sliced.trim()) setPendingAgent(undefined);
                  }
                }}
                onSubmit={() => handleSend()}
                isLoading={isLoading}
                disabled={false}
                maxHeight={160}
                className="w-full border-slate-200 shadow-sm transition-shadow focus-within:border-[#10B981]/40 focus-within:shadow-md"
              >
                {pendingAgentMeta && (
                  <div className="flex items-center gap-2 px-2 pb-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-[#059669]">
                      <span>{pendingAgentMeta.emoji}</span>
                      {pendingAgentMeta.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingAgent(undefined)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Ajan seçimini kaldır"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-2 pb-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex max-w-[180px] items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        <Paperclip className="size-3.5 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          className="ml-1 rounded-full text-slate-400 hover:text-slate-700"
                          onClick={() => {
                            setAttachedFiles((files) =>
                              files.filter((_, fileIndex) => fileIndex !== index),
                            );
                            if (uploadInputRef.current) uploadInputRef.current.value = "";
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <PromptInputTextarea
                  placeholder="Finansal durumun hakkında soru sor..."
                  maxLength={500}
                  className="min-h-[52px] px-3 py-2.5"
                />
                <PromptInputActions className="flex items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="Dosya ekle">
                      <label
                        htmlFor="assistant-file-upload"
                        className="flex h-8 w-8 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        <input
                          ref={uploadInputRef}
                          id="assistant-file-upload"
                          type="file"
                          multiple
                          accept=".csv,.pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            if (event.target.files) {
                              setAttachedFiles(Array.from(event.target.files));
                            }
                          }}
                        />
                        <Paperclip className="size-5" />
                      </label>
                    </PromptInputAction>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {input.length}/500
                    </span>
                  </div>
                  <PromptInputAction tooltip={isLoading ? "Durdur" : "Gönder"}>
                    <Button
                      variant="primary"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-slate-950 hover:bg-slate-800 focus:ring-slate-400"
                      onClick={isLoading ? handleStop : () => handleSend()}
                      disabled={!isLoading && !input.trim()}
                      type="button"
                    >
                      {isLoading ? (
                        <Square className="size-4 fill-current" />
                      ) : (
                        <ArrowUp className="size-5" />
                      )}
                    </Button>
                  </PromptInputAction>
                </PromptInputActions>
              </PromptInput>
            </div>
          </div>
        </div>

        {/* Right: Insights sidebar */}
        <AssistantSidebar
          latestResponse={latestResponse}
          overview={overview?.stats ?? null}
          hasConversation={isLoading || hasMessages}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5" />
        Bu bilgiler yalnızca genel bilgilendirme amaçlıdır; kişisel finansal yatırım tavsiyesi
        niteliği taşımaz.
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <React.Suspense fallback={null}>
      <AssistantPageInner />
    </React.Suspense>
  );
}
