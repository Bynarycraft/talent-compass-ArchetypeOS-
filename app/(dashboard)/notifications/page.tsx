"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";

type NotificationItem = {
  id: string;
  timestamp: string;
  details?: {
    title?: string;
    message?: string;
    priority?: string;
  } | null;
  user?: { name?: string | null; email?: string | null } | null;
};

type Learner = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    receiverId: "",
    title: "",
    message: "",
    priority: "normal",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [notificationsRes, learnersRes] = await Promise.all([
          fetch("/api/notifications"),
          fetch("/api/supervisor/learners"),
        ]);

        if (notificationsRes.ok) {
          const data = await notificationsRes.json();
          setItems(data);
        }

        if (learnersRes.ok) {
          const data = await learnersRes.json();
          setLearners(data);
        }
      } catch (_error) {
        console.error("Failed to load notifications");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const priorityBadge = (priority?: string) => {
    if (priority === "high") return "bg-rose-500/15 text-rose-500";
    if (priority === "low") return "bg-emerald-500/15 text-emerald-500";
    return "bg-amber-500/15 text-amber-500";
  };

  const canSend = useMemo(() => {
    const role = session?.user?.role?.toLowerCase();
    return role === "admin" || role === "supervisor";
  }, [session?.user?.role]);

  const handleSend = async () => {
    if (!form.receiverId || !form.message.trim()) {
      toast.error("Receiver and message are required");
      return;
    }

    setSending(true);
    try {
      const isBulk = form.receiverId === "all";
      const receiverIds = isBulk ? learners.map((learner) => learner.id) : undefined;
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: form.receiverId,
          receiverIds,
          title: form.title.trim() || undefined,
          message: form.message.trim(),
          priority: form.priority,
        }),
      });

      if (res.ok) {
        if (isBulk) {
          toast.success(`Notification sent to ${receiverIds?.length || 0} recipients`);
        } else {
          toast.success("Notification sent");
        }
        setForm({ receiverId: "", title: "", message: "", priority: "normal" });
        const refreshed = await fetch("/api/notifications");
        if (refreshed.ok) {
          setItems(await refreshed.json());
        }
      } else {
        toast.error("Failed to send notification");
      }
    } catch (_error) {
      toast.error("Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient flex items-center gap-3">
          <Bell className="h-7 w-7" /> Notifications
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Mission updates and guidance from your leadership chain.
        </p>
      </div>

      {canSend && (
        <Card className="border-none glass-card rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black">Send Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={form.receiverId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, receiverId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assigned learners</SelectItem>
                {learners.map((learner) => (
                  <SelectItem key={learner.id} value={learner.id}>
                    {learner.name || learner.email} ({learner.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Textarea
              placeholder="Message"
              className="min-h-[120px]"
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            />
            <Select
              value={form.priority}
              onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSend} disabled={sending} className="rounded-2xl font-black">
              {sending ? "Sending..." : "Send Notification"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading notifications...</div>
      ) : items.length === 0 ? (
        <Card className="border-none glass-card rounded-3xl">
          <CardContent className="p-10 text-center space-y-3">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-none glass-card rounded-2xl">
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg font-black">
                    {item.details?.title || "Update"}
                  </CardTitle>
                  <Badge className={`text-[10px] uppercase tracking-widest ${priorityBadge(item.details?.priority)}`}>
                    {item.details?.priority || "normal"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {item.details?.message || "No message provided."}
                </p>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  {item.user?.name || item.user?.email || "System"} · {new Date(item.timestamp).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
