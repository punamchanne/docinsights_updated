import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Send,
  FileText,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Sparkles,
  ArrowLeft,
  Quote,
} from "lucide-react";
import type { Document, ChatMessage } from "@shared/mongo-schema";
import { format } from "date-fns";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const exampleQuestions = [
  "What is the main topic of this document?",
  "Summarize the key points mentioned",
  "What are the important dates or deadlines?",
  "List all the people mentioned",
  "What organizations are referenced?",
];

const ChatMessageContent = ({ content }: { content: string }) => {
  const parts = content.split("**Sources**");
  const mainContent = parts[0];
  const sourcesRaw = parts[1];

  const sources = sourcesRaw?.split(/\n\[\d+\]/).slice(1).map((s, i) => ({
    number: i + 1,
    text: s.trim().replace(/^\s*-\s*/, ""),
  }));

  return (
    <div className="space-y-4">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          div: ({ node, ...props }) => <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed" {...props} />,
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="" {...props} />,
          code: ({ node, ...props }) => <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props} />,
        }}
      >
        {mainContent}
      </Markdown>
      {sources && sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/40">
          <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-primary" />
            Sources
          </h4>
          <div className="grid gap-3">
            {sources.map((source) => (
              <div key={source.number} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors">
                <div className="w-5 h-5 flex-shrink-0 text-[10px] flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {source.number}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "{source.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Chat() {
  const [, params] = useRoute("/chat/:id");
  const documentId = params?.id;

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: document, isLoading: documentLoading } = useQuery<Document>({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  });

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", documentId],
    enabled: !!documentId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!documentId) throw new Error("No document ID");
      return await apiRequest("POST", "/api/chat", {
        documentId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", documentId] });
      setMessage("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, sendMessageMutation.isPending]);

  const handleSend = () => {
    if (!message.trim() || !documentId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleQuestion = (question: string) => {
    setMessage(question);
  };

  if (documentLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading document context...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center p-8 bg-card border rounded-2xl max-w-md mx-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-6 border border-border">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-2">Document not found</h3>
          <p className="text-muted-foreground mb-6">We couldn't find the document you're looking for.</p>
          <Link href="/documents">
            <Button variant="outline" className="border-primary/20 hover:bg-muted">
              Back to Documents
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      <Card className="flex-1 flex flex-col border overflow-hidden shadow-lg">
        <CardHeader className="flex-shrink-0 border-b bg-muted/30 py-4">
          <div className="flex items-center gap-4">
            <Link href="/documents">
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/10">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
                <span className="text-muted-foreground font-normal">Chat with:</span>
                <span className="text-primary">{document.originalName}</span>
              </CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02] pointer-events-none" />

          <ScrollArea className="flex-1 p-6">
            {messagesLoading ? (
              <div className="space-y-6 max-w-3xl mx-auto pt-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="space-y-3 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-24 w-full rounded-2xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : chatMessages && chatMessages.length > 0 ? (
              <div className="space-y-8 max-w-3xl mx-auto pt-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    data-testid={`chat-message-${msg._id}`}
                  >
                    <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg
                        ${msg.role === "assistant"
                        ? "bg-background border border-primary/20 text-primary"
                        : "bg-primary/10 border border-primary/20 text-primary"
                      }
                    `}>
                      {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    <div className={`
                      max-w-[85%] rounded-2xl p-5 shadow-sm
                      ${msg.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto rounded-tr-sm"
                        : "bg-muted/50 border rounded-tl-sm"
                      }
                    `}>
                      {msg.role === "assistant" ? (
                        <ChatMessageContent content={msg.content} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed font-medium">
                          {msg.content}
                        </p>
                      )}

                      <div className={`flex items-center gap-1 mt-2 text-[10px] opacity-70 ${msg.role === "user" ? "justify-end text-primary-foreground" : "text-muted-foreground"}`}>
                        {msg.createdAt && format(new Date(msg.createdAt), "h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-background border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-lg text-primary">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="bg-muted/50 border rounded-2xl rounded-tl-sm p-5 flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Analyzing document...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Bot className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-3 tracking-tight">How can I help you?</h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  I've analyzed <span className="text-primary font-medium">{document.originalName}</span>. Ask me anything about it!
                </p>
                <div className="grid gap-3 w-full">
                  {exampleQuestions.slice(0, 3).map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-4 px-6 rounded-xl border-primary/10 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all group"
                      onClick={() => handleExampleQuestion(question)}
                    >
                      <Sparkles className="w-4 h-4 mr-3 text-primary/50 group-hover:text-primary transition-colors" />
                      <span className="text-sm font-medium">{question}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          <div className="p-6 border-t border-border/40 bg-background/20 backdrop-blur-md">
            <div className="max-w-3xl mx-auto relative">
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary/5 to-transparent opacity-0 transition-opacity peer-focus-within:opacity-100 rounded-xl" />
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this document..."
                className="min-h-[60px] resize-none pr-16 bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-0 shadow-inner rounded-xl py-4 px-5 text-base"
                disabled={sendMessageMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-lg bg-primary hover:bg-primary/90"
                data-testid="button-send-message"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-center text-[10px] text-muted-foreground mt-3">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-80 hidden 2xl:flex flex-col flex-shrink-0 border shadow-md">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Quote className="w-4 h-4 text-primary" />
            Suggested Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-4">
          <div className="space-y-2">
            {exampleQuestions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start text-left h-auto py-3 px-3 rounded-lg hover:bg-primary/10 hover:text-primary transition-all whitespace-normal leading-snug"
                onClick={() => handleExampleQuestion(question)}
              >
                <span className="text-sm">{question}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
