import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

type Notif = {
  id: string; title: string; body: string | null;
  link: string | null; read: boolean; created_at: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
    setItems((data as Notif[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`notifs-${user.id}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
      () => load()
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unread = items.filter((i) => !i.read).length;

  const markAll = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  if (!user) return null;

  return (
    <Popover onOpenChange={(o) => o && markAll()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-2 font-semibold">Notifications</div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
          ) : items.map((n) => (
            <Link key={n.id} to={n.link ?? "#"} className="block border-b border-border/50 px-4 py-3 hover:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{n.title}</p>
                {!n.read && <Badge className="h-1.5 w-1.5 rounded-full p-0" />}
              </div>
              {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
