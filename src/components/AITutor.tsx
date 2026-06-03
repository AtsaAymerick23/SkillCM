import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Send, User, Bot, BookOpen } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Citation = { id: string; position: number; title: string; excerpt?: string };
type Msg = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export const AITutor = ({
  courseId,
  courseSlug,
  courseTitle,
}: {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}) => {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const ask = async () => {
    const question = q.trim();
    if (!question || loading) return;
    const history: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(history);
    setQ("");
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-tutor", {
      body: {
        courseId,
        lang,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast.error(error?.message || (data as any).error);
      setMessages((prev) => prev.slice(0, -1));
      setQ(question);
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: (data as any).answer,
        citations: (data as any).citations ?? [],
      },
    ]);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-grad-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </span>
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold">{t("tutor.title")}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{courseTitle}</div>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[360px] space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("tutor.placeholder")}</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-soft text-foreground"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{m.content}</span>
              )}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-2 border-t border-border/40 pt-1.5 text-xs">
                  <div className="font-semibold text-muted-foreground">{t("tutor.sources")}</div>
                  <ul className="mt-1 space-y-1">
                    {m.citations.map((c) => {
                      const hash = c.excerpt ? `#cite=${encodeURIComponent(c.excerpt.slice(0, 80))}` : "";
                      return (
                        <li key={c.id}>
                          <Link
                            to={`/courses/${courseSlug}/lessons/${c.id}${hash}`}
                            className="group inline-flex items-start gap-1 rounded-md bg-primary/10 px-1.5 py-1 text-primary transition hover:bg-primary/20"
                          >
                            <BookOpen className="mt-0.5 h-3 w-3 flex-none" />
                            <span>
                              <span className="font-semibold">L{c.position}</span> · {c.title}
                              {c.excerpt && (
                                <span className="block text-[11px] italic text-muted-foreground line-clamp-2">
                                  "{c.excerpt}"
                                </span>
                              )}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            {m.role === "user" && (
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-secondary/40">
                <User className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("tutor.thinking")}
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("tutor.placeholder")}
            rows={2}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />
          <Button onClick={ask} disabled={loading || !q.trim()} size="icon" className="bg-grad-primary">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
