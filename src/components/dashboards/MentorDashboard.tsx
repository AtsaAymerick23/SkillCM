import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Check, X } from "lucide-react";

type Opp = { id: string; title: string; organization: string; status: string; type: string };
type Booking = {
  id: string; cadet_id: string; status: string; note: string | null;
  requested_at: string; scheduled_at: string | null;
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-primary text-primary-foreground",
  pending_approval: "bg-secondary/40 text-foreground",
  rejected: "bg-destructive/10 text-destructive",
  draft: "bg-muted text-muted-foreground",
};

export function MentorDashboard() {
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opp[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = async () => {
    if (!user) return;
    const [{ data: o }, { data: b }] = await Promise.all([
      supabase.from("opportunities").select("id, title, organization, status, type")
        .eq("posted_by", user.id).order("created_at", { ascending: false }),
      supabase.from("mentor_bookings").select("*")
        .eq("mentor_id", user.id).order("requested_at", { ascending: false }),
    ]);
    setOpps((o as Opp[]) ?? []);
    setBookings((b as Booking[]) ?? []);
  };

  useEffect(() => { load(); }, [user]);

  const decideBooking = async (id: string, accept: boolean) => {
    const { error } = await supabase.from("mentor_bookings")
      .update({ status: accept ? "accepted" : "declined" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? "Booking accepted" : "Booking declined");
    load();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="opps">
        <TabsList>
          <TabsTrigger value="opps">My Opportunities</TabsTrigger>
          <TabsTrigger value="bookings">
            Booking Requests {bookings.filter(b => b.status === "pending").length > 0 && (
              <Badge className="ml-2">{bookings.filter(b => b.status === "pending").length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opps" className="mt-6 space-y-3">
          <Button asChild className="bg-grad-primary">
            <Link to="/opportunities"><Plus className="mr-1 h-4 w-4" /> Post new opportunity</Link>
          </Button>
          {opps.length === 0 && <p className="text-muted-foreground">No opportunities posted yet.</p>}
          {opps.map(o => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">{o.type}</Badge>
                  <span className="font-medium">{o.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{o.organization}</p>
              </div>
              <Badge className={`capitalize ${STATUS_COLOR[o.status] ?? ""}`}>
                {o.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6 space-y-3">
          {bookings.length === 0 && <p className="text-muted-foreground">No booking requests yet. Cadets must contact you first.</p>}
          {bookings.map(b => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Cadet: {b.cadet_id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground">Requested {new Date(b.requested_at).toLocaleString()}</p>
                  {b.note && <p className="mt-2 text-sm whitespace-pre-wrap">{b.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{b.status}</Badge>
                  {b.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => decideBooking(b.id, true)}>
                        <Check className="mr-1 h-4 w-4" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decideBooking(b.id, false)}>
                        <X className="mr-1 h-4 w-4" /> Decline
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
