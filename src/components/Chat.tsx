import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface ChatProps {
  onSendMessage: (message: string) => void;
  messages: Array<{ role: 'user' | 'assistant'; content: string; isStreaming?: boolean }>;
  disabled?: boolean;
}

interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

const Message: React.FC<MessageProps> = ({ role, content, isStreaming }) => {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default function Chat({ onSendMessage, messages, disabled }: ChatProps) {
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && lastMessageRef.current) {
      const container = chatContainerRef.current;
      if (container) {
        const { scrollHeight, clientHeight } = container;
        container.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isScrolledNearBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
      setAutoScroll(isScrolledNearBottom);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      setAutoScroll(true);
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              ref={index === messages.length - 1 ? lastMessageRef : null}
              className="animate-fade-in"
            >
              <Message
                role={message.role}
                content={message.content}
                isStreaming={message.isStreaming}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="border-t bg-white">
        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={disabled ? "Ollama not connected..." : "Ask about locations..."}
              className={`flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                disabled ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              disabled={disabled}
            />
            <button
              type="submit"
              className={`p-2 rounded-lg transition-colors ${
                disabled || !input.trim()
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={disabled || !input.trim()}
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}