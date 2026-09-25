'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { cn, renderMarkdown } from '@/lib/utils';
import type { Message, AgentType, Engagement } from '@/types';
import { AGENT_META } from '@/types';

const AGENT_COLORS: Record<AgentType, string> = {
  orchestrator: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  analyst: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  operations: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  sales: 'bg-green-500/10 text-green-400 border-green-500/20',
  finance: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  copywriter: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  technical: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

interface ChatInterfaceProps {
  engagement: Engagement;
  onMessagesUpdate: (messages: Message[]) => void;
  onSummaryUpdate: (summary: string) => void;
}

export default function ChatInterface({ engagement, onMessagesUpdate, onSummaryUpdate }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('orchestrator');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [engagement.messages.length, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    setShowScrollButton(!isNearBottom);
  }, []);

  const buildDocumentContext = useCallback(() => {
    if (!engagement.documents.length) return '';
    return engagement.documents
      .map((d) => `--- File: ${d.name} ---\n${d.extractedText}`)
      .join('\n\n');
  }, [engagement.documents]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: Message = {
        id: uuidv4(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const assistantMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        agentType: selectedAgent,
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...engagement.messages, userMsg, assistantMsg];
      onMessagesUpdate(newMessages);
      setInput('');
      setIsStreaming(true);

      setTimeout(() => scrollToBottom(true), 50);

      try {
        const apiMessages = newMessages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: apiMessages,
            agentType: selectedAgent,
            documentContext: buildDocumentContext(),
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`API error ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });

          const updated = newMessages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: fullText } : m
          );
          onMessagesUpdate(updated);

          const el = scrollContainerRef.current;
          if (el) {
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
            if (isNearBottom) scrollToBottom(false);
          }
        }

        // If this is the first response from orchestrator, use it as executive summary seed
        if (selectedAgent === 'orchestrator' && !engagement.executiveSummary && fullText.length > 100) {
          onSummaryUpdate(fullText);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Something went wrong';
        const updated = newMessages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `[Error: ${errMsg}. Please check your API key and try again.]` }
            : m
        );
        onMessagesUpdate(updated);
      } finally {
        setIsStreaming(false);
      }
    },
    [engagement, selectedAgent, isStreaming, buildDocumentContext, onMessagesUpdate, onSummaryUpdate, scrollToBottom]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const toggleVoice = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input requires Chrome or Edge browser.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SR = win.webkitSpeechRecognition || win.SpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e: { results: { [0]: { [0]: { transcript: string } } } }) => {
      const text = e.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    };

    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording]);

  const generateInitialAnalysis = useCallback(() => {
    const context = engagement.documents.map((d) => d.name).join(', ');
    const prompt = engagement.primaryChallenge
      ? `I need a full analysis of my business situation. ${engagement.primaryChallenge}${engagement.desiredOutcome ? ` My goal is: ${engagement.desiredOutcome}.` : ''} Please analyze the uploaded documents and provide your full strategic assessment.`
      : `Please analyze the uploaded documents (${context}) and provide a complete strategic assessment with your key findings, recommendations, and implementation roadmap.`;
    sendMessage(prompt);
  }, [engagement, sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Agent selector */}
      <div className="flex items-center gap-2 p-3 border-b border-[#1e2d40] overflow-x-auto shrink-0">
        {(Object.keys(AGENT_META) as AgentType[]).map((type) => {
          const meta = AGENT_META[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedAgent(type)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap shrink-0',
                selectedAgent === type
                  ? AGENT_COLORS[type]
                  : 'border-[#1e2d40] text-slate-500 hover:text-slate-300 hover:border-slate-600'
              )}
            >
              <span>{meta.icon}</span>
              {meta.name}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative"
      >
        {engagement.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="font-semibold text-slate-200 mb-2">Ready for Analysis</h3>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              {engagement.documents.length > 0
                ? 'Your documents are loaded. Start the analysis or ask a specific question.'
                : 'Upload documents above, then ask your first question or run a full analysis.'}
            </p>
            {engagement.documents.length > 0 && (
              <button
                type="button"
                onClick={generateInitialAnalysis}
                disabled={isStreaming}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Run Full Analysis
              </button>
            )}
          </div>
        )}

        {engagement.messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && idx === engagement.messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-6 w-8 h-8 bg-[#1a2437] border border-[#1e2d40] rounded-full flex items-center justify-center shadow-lg hover:bg-[#1e2d40] transition-colors z-10"
        >
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-[#1e2d40] shrink-0">
        <div className="flex items-end gap-2 bg-[#0d1630] rounded-xl border border-[#1e2d40] focus-within:border-blue-500/50 transition-colors px-3 py-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Ask the ${AGENT_META[selectedAgent].name}... (Enter to send, Shift+Enter for new line)`}
            disabled={isStreaming}
            rows={1}
            className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 text-sm resize-none focus:outline-none min-h-[36px] max-h-[160px] py-1.5"
          />
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={toggleVoice}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isRecording
                  ? 'text-red-400 bg-red-500/10 animate-pulse'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              )}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">
          Active agent: <span className="text-slate-500">{AGENT_META[selectedAgent].name}</span> — switch agents above to change expertise
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5',
          isUser
            ? 'bg-blue-600 text-white font-semibold'
            : message.agentType
            ? AGENT_COLORS[message.agentType].split(' ')[0] + ' ' + AGENT_COLORS[message.agentType].split(' ')[1]
            : 'bg-slate-700 text-slate-300'
        )}
      >
        {isUser ? 'Y' : message.agentType ? AGENT_META[message.agentType].icon : '🤖'}
      </div>

      <div className={cn('flex-1 max-w-[85%]', isUser && 'flex flex-col items-end')}>
        {!isUser && message.agentType && (
          <p className="text-xs text-slate-500 mb-1 font-medium">
            {AGENT_META[message.agentType].name}
          </p>
        )}
        <div
          className={cn(
            'rounded-xl px-4 py-3 text-sm',
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-[#111827] border border-[#1e2d40] rounded-tl-sm'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className={cn('prose-agent', isStreaming && !message.content && 'typing-cursor')}
              dangerouslySetInnerHTML={{
                __html: message.content
                  ? renderMarkdown(message.content)
                  : '<p class="text-slate-500">Thinking...</p>',
              }}
            />
          )}
          {isStreaming && message.content && (
            <span className="inline-block w-2 h-4 bg-blue-400 animate-blink ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
}
