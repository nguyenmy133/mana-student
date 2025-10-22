// src/pages/ChatAI.tsx
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Plus, MessageCircle, Bot, User } from "lucide-react";

/** Base URL backend (đổi nếu cần) – luôn sạch dấu "/" cuối */
const API_BASE = (import.meta?.env?.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

type Sender = "user" | "ai";
type ChatMessage = { id: string; sender: Sender; content: string; time: string };

export const ChatAI = () => {
  const [selectedChat, setSelectedChat] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // == LỊCH SỬ CHAT (không còn danh sách cứng) ==
  const [store, setStore] = useState<Record<number, ChatMessage[]>>({});

  // Nếu chưa có cuộc trò chuyện nào, tạo một cuộc mới
  useEffect(() => {
    if (Object.keys(store).length === 0) {
      const id = Date.now();
      setStore({ [id]: [] });
      setSelectedChat(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [store, selectedChat, loading]);

  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const addMsg = (chatId: number, m: ChatMessage) =>
    setStore((s) => ({ ...s, [chatId]: [...(s[chatId] ?? []), m] }));

  async function callAI(text: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // ChatRequestDTO { message: string }
      body: JSON.stringify({ message: text }),
    });

    const ct = res.headers.get("content-type") || "";
    const payload = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${detail}`);
    }

   
    return (payload?.reply ?? payload?.response ?? "Không có phản hồi từ AI.");
  }

  const handleSendMessage = async () => {
    const text = message.trim();
    if (!text || loading || !selectedChat) return;

    const chatId = selectedChat;
    setMessage("");
    const userMsg: ChatMessage = { id: crypto.randomUUID(), sender: "user", content: text, time: now() };
    addMsg(chatId, userMsg);

    setLoading(true);
    try {
      const reply = await callAI(text);
      const aiMsg: ChatMessage = { id: crypto.randomUUID(), sender: "ai", content: reply, time: now() };
      addMsg(chatId, aiMsg);
    } catch (e: any) {
      addMsg(chatId, {
        id: crypto.randomUUID(),
        sender: "ai",
        content: `Lỗi gọi AI: ${e?.message ?? "unknown"}`,
        time: now(),
      });
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const messages = store[selectedChat] ?? [];
  const chatIds = Object.keys(store)
    .map(Number)
   
    .sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Chat AI Assistant</h1>
        <Button
          className="flex items-center space-x-2"
          onClick={() => {
            const id = Date.now();
            setStore((s) => ({ ...s, [id]: [] }));
            setSelectedChat(id);
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Cuộc trò chuyện mới</span>
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-6 h-[600px]">
        {/* Lịch sử chat */}
        <Card className="lg:col-span-1">
          <CardContent className="p-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>Lịch sử chat</span>
              </h3>
            </div>

            <div className="space-y-1">
              {chatIds.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">Chưa có lịch sử. Hãy tạo cuộc trò chuyện mới.</div>
              )}

              {chatIds.map((id) => {
                const last = store[id]?.at(-1);
                const title = `Chat #${id}`;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedChat(id)}
                    className={`p-4 cursor-pointer hover:bg-muted/50 border-b transition-colors ${
                      selectedChat === id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">{title}</h4>
                      <span className="text-xs text-muted-foreground">{last?.time ?? ""}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {last?.content ?? "Bắt đầu trò chuyện"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Khu vực chat */}
        <Card className="lg:col-span-3 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">{loading ? "AI đang trả lời..." : "Luôn sẵn sàng hỗ trợ"}</p>
            </div>
          </div>

          {/* Messages */}
          <CardContent ref={listRef} className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {msg.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`rounded-lg p-3 ${
                        msg.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {msg.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-muted-foreground">Đang tạo câu trả lời…</div>}
            </div>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                placeholder="Nhập tin nhắn..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1"
                disabled={loading}
              />
              <Button onClick={handleSendMessage} size="icon" disabled={loading || !message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatAI;
