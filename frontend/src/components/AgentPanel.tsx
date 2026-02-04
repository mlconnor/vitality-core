/**
 * Agent Panel Component
 * 
 * Right-side panel for AI agent chat interactions.
 * Placeholder UI that will be connected to Vercel AI SDK.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Mic,
  Sparkles,
  Settings,
  Trash2,
  Bot,
  User,
  Loader2,
  Wrench,
  Database,
  Cloud,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'running' | 'completed' | 'error';
}

// Welcome message shown when chat is empty
const WELCOME_MESSAGE = `Hello! I'm your Vitality AI assistant. I can help you with:

• **Menu planning** - Create and optimize cycle menus
• **Recipe management** - Scale recipes, calculate costs
• **Inventory** - Check stock levels, create orders
• **Diner info** - Look up dietary requirements

How can I help you today?`;

// Placeholder messages for demo
const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: WELCOME_MESSAGE,
    timestamp: new Date(),
  },
];

export function AgentPanel() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response with tool calls
    // In production, this would use Vercel AI SDK's useChat hook
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'll help you with that. Let me check the database...",
        timestamp: new Date(),
        toolCalls: [
          {
            id: 'tool-1',
            name: 'db_query',
            args: { table: 'recipes', filter: { category: 'Entrée' } },
            result: { count: 45, sample: ['Chicken Parmesan', 'Grilled Salmon'] },
            status: 'completed',
          },
        ],
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const toggleToolExpand = (toolId: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const clearChat = () => {
    setMessages(initialMessages);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>
            <p className="text-xs text-muted-foreground">GPT-4o</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={clearChat}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button 
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            expandedTools={expandedTools}
            onToggleTool={toggleToolExpand}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask anything about your kitchen operations..."
            className="w-full px-4 py-3 pr-24 bg-secondary/50 border border-border rounded-xl text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              type="button"
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Voice input"
            >
              <Mic className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// Message bubble component
interface MessageBubbleProps {
  message: Message;
  expandedTools: Set<string>;
  onToggleTool: (id: string) => void;
}

function MessageBubble({ message, expandedTools, onToggleTool }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const copyContent = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center
        ${isUser 
          ? 'bg-secondary' 
          : 'bg-gradient-to-br from-emerald-500 to-teal-600'
        }
      `}>
        {isUser ? (
          <User className="w-4 h-4 text-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${isUser ? 'text-right' : ''}`}>
        <div className={`
          inline-block max-w-full rounded-xl px-4 py-3 text-sm
          ${isUser 
            ? 'bg-primary text-primary-foreground rounded-tr-none' 
            : 'bg-secondary text-foreground rounded-tl-none'
          }
        `}>
          {/* Message content with basic markdown support */}
          <div className="prose prose-sm prose-invert max-w-none">
            {message.content.split('\n').map((line, i) => (
              <p key={i} className="mb-1 last:mb-0">
                {line.split('**').map((part, j) => 
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
              </p>
            ))}
          </div>
        </div>

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.toolCalls.map((tool) => (
              <ToolCallDisplay 
                key={tool.id} 
                tool={tool}
                expanded={expandedTools.has(tool.id)}
                onToggle={() => onToggleTool(tool.id)}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={copyContent}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Tool call display component
interface ToolCallDisplayProps {
  tool: ToolCall;
  expanded: boolean;
  onToggle: () => void;
}

function ToolCallDisplay({ tool, expanded, onToggle }: ToolCallDisplayProps) {
  const getToolIcon = (name: string) => {
    if (name.startsWith('db_')) return Database;
    if (name.startsWith('weather_') || name.startsWith('sysco_')) return Cloud;
    return Wrench;
  };

  const Icon = getToolIcon(tool.name);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-mono text-foreground">{tool.name}</span>
        <span className={`
          ml-auto text-xs px-1.5 py-0.5 rounded
          ${tool.status === 'completed' 
            ? 'bg-primary/20 text-primary' 
            : tool.status === 'error'
            ? 'bg-destructive/20 text-destructive'
            : 'bg-amber-500/20 text-amber-400'
          }
        `}>
          {tool.status}
        </span>
      </button>

      {expanded && (
        <div className="px-3 py-2 border-t border-border text-xs">
          <div className="mb-2">
            <span className="text-muted-foreground">Arguments:</span>
            <pre className="mt-1 p-2 bg-muted rounded text-muted-foreground overflow-x-auto">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>
          {tool.result !== undefined && (
            <div>
              <span className="text-muted-foreground">Result:</span>
              <pre className="mt-1 p-2 bg-muted rounded text-primary overflow-x-auto">
                {JSON.stringify(tool.result as Record<string, unknown>, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
