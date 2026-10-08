"use client";

import { useRef, useState, type FormEvent } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { Button, LoadingIndicator } from "@/components/ui";
import { createAssistantRequest, type AssistantReply, type AssistantScenarioSummary } from "@/lib/assistant/contract";
import { assessmentAssistantService } from "@/lib/services/assessment-assistant";
import { buildRecommendations } from "@/lib/recommendations";
import type { AssessmentContext } from "@/lib/assessment";
import type { SolarInputs, SolarResults } from "@/lib/solar";

const SUGGESTED_QUESTIONS = [
  "What are the most important assumptions in this estimate?",
  "What could improve the estimate?",
  "How do the sample scenarios differ?",
  "What should I confirm before requesting a quote?",
];

export function AssessmentAssistant({ inputs, result, scenarioName, context, scenarios }: {
  inputs: SolarInputs;
  result: SolarResults;
  scenarioName: string;
  context?: AssessmentContext;
  scenarios: AssistantScenarioSummary[];
}) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const recommendations = buildRecommendations(inputs, result, context);

  async function ask(value: string) {
    const clean = value.trim().slice(0, 1000);
    if (!clean || busy) return;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setQuestion(clean);
    setBusy(true);
    try {
      const request = createAssistantRequest({ inputs, result, question: clean, scenarioName, recommendations, scenarios });
      const answer = await assessmentAssistantService.answer(request, nextController.signal);
      if (!nextController.signal.aborted) setReply(answer);
    } finally {
      if (!nextController.signal.aborted) setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return <section className="card assistant-card assistant-panel" id="assistant" aria-labelledby="assistant-title">
    <div className="assistant-head">
      <div className="assistant-icon"><Bot size={16} aria-hidden="true"/></div>
      <div className="assistant-label"><h2 id="assistant-title">Ask about this assessment</h2><small>Facts stay tied to the SolarSmart calculation engine</small></div>
      <span className="optional-pill">STRANDS OPTIONAL</span>
    </div>
    <p className="assistant-privacy">No request is sent until you ask. The assistant receives calculation inputs, results, and your question; location, roof images, and history are excluded. With no model configured, it answers locally.</p>
    <div className="assistant-suggestions" aria-label="Suggested questions">{SUGGESTED_QUESTIONS.map(item => <Button key={item} variant="secondary" size="sm" onClick={() => void ask(item)} disabled={busy}>{item}</Button>)}</div>
    <form className="assistant-question-form" onSubmit={submit}>
      <label htmlFor="assistant-question">Ask a question about the current report</label>
      <div className="assistant-question-row"><textarea id="assistant-question" className="ui-input" rows={2} maxLength={1000} value={question} onChange={event => setQuestion(event.target.value)} placeholder="For example: why is payback unavailable?" disabled={busy}/><Button type="submit" disabled={busy || !question.trim()}><Send size={14} aria-hidden="true"/> Ask</Button></div>
      <small>Up to 1,000 characters. Avoid entering personal or account information.</small>
    </form>
    {busy && <div className="assistant-loading" aria-live="polite"><LoadingIndicator label="Reviewing this assessment"/></div>}
    {!busy && reply && <section className="assistant-reply" aria-labelledby="assistant-answer-title" aria-live="polite">
      <div className="assistant-reply-head"><h3 id="assistant-answer-title">Answer</h3><span className={`assistant-mode assistant-mode-${reply.mode}`}>{reply.mode === "strands" ? <><Sparkles size={12}/> Strands response</> : <><Bot size={12}/> Local fallback</>}</span></div>
      <p className="assistant-status">{reply.status}</p><p className="assistant-narrative">{reply.narrative}</p>
      <AssistantList title="Calculated facts" items={reply.facts}/>
      <AssistantList title="Assumptions" items={reply.assumptions}/>
      <AssistantList title="Unknowns and limitations" items={reply.unknowns}/>
      <AssistantList title="Practical next steps" items={reply.nextSteps}/>
    </section>}
  </section>;
}

function AssistantList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <div className="assistant-result-group"><h4>{title}</h4><ul>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>;
}
