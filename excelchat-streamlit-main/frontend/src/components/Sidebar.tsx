import { useState, useEffect } from "react";
import { MessageSquarePlus, Library, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ChatSession {
  id: string;
  filename: string;
  created_at: string;
  message_count: number;
}

interface SidebarProps {
  onNewChat?: () => void;
  onSelectSession?: (id: string) => void;
  refreshTrigger?: number; // Increment this to trigger a reload
}

const Sidebar = ({ onNewChat, onSelectSession, refreshTrigger }: SidebarProps) => {
  const [chats, setChats] = useState<ChatSession[]>([]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      if (data.success) {
        setChats(data.sessions);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  useEffect(() => {
    loadSessions();
    // Removed automatic polling - sessions will reload when refreshTrigger changes
  }, [refreshTrigger]);

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="flex items-center gap-2 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">AI</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3 py-2 space-y-1">
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          size="sm"
          onClick={onNewChat}
        >
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New chat
        </Button>
        <Button variant="ghost" className="w-full justify-start" size="sm">
          <Library className="mr-2 h-4 w-4" />
          Library
        </Button>
      </div>

      <Separator className="my-2" />

      {/* Chats */}
      <div className="flex-1 px-3 py-2 overflow-hidden">
        <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Chats
        </h3>
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {chats.map((chat) => (
              <Button
                key={chat.id}
                variant="ghost"
                className="w-full justify-start text-left truncate flex-col items-start h-auto py-2"
                size="sm"
                title={chat.filename}
                onClick={() => onSelectSession?.(chat.id)}
              >
                <span className="font-medium truncate w-full">{chat.filename}</span>
                <span className="text-xs text-muted-foreground">
                  {chat.message_count} messages
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* User Profile */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">midhun</p>
            <p className="text-xs text-muted-foreground">Free</p>
          </div>
          <Button variant="secondary" size="sm" className="text-xs">
            Upgrade
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
