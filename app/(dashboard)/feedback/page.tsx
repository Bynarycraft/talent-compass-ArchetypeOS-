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
import { MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";

type FeedbackItem = {
  id: string;
  text: string;
  type: string;
  rating: number | null;
  createdAt: string;
  sender?: { name?: string | null; email?: string | null } | null;
};

type Learner = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export default function FeedbackPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    receiverId: "",
    subject: "",
    text: "",
    type: "comment",
    rating: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [feedbackRes, learnersRes] = await Promise.all([
          fetch("/api/feedback"),
          fetch("/api/supervisor/learners"),
        ]);

        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          setItems(data);
        }

        if (learnersRes.ok) {
          const data = await learnersRes.json();
          setLearners(data);
        }
      } catch (_error) {
        console.error("Failed to load feedback");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const canSend = useMemo(() => {
    const role = session?.user?.role?.toLowerCase();
    return role === "admin" || role === "supervisor";
  }, [session?.user?.role]);

  const handleSend = async () => {
    if (!form.receiverId || !form.text.trim()) {
      toast.error("Recipient and message are required");
      return;
    }

    setSending(true);
    try {
      const payload = {
        receiverId: form.receiverId,
        type: form.type,
        text: form.text.trim(),
        rating: form.rating ? Number(form.rating) : null,
        threadId: form.subject.trim() || undefined,
      };

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Feedback sent");
        setForm({ receiverId: "", subject: "", text: "", type: "comment", rating: "" });
        const refreshed = await fetch("/api/feedback");
        if (refreshed.ok) {
          setItems(await refreshed.json());
        }
      } else {
        toast.error("Failed to send feedback");
      }
    } catch (_error) {
      toast.error("Failed to send feedback");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient flex items-center gap-3">
          <MessageSquare className="h-7 w-7" /> Feedback Inbox
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Direct feedback from supervisors and peers.
        </p>
      </div>

      {canSend && (
        <Card className="border-none glass-card rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black">Send Feedback</CardTitle>
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
                {learners.map((learner) => (
                  <SelectItem key={learner.id} value={learner.id}>
                    {learner.name || learner.email} ({learner.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Subject"
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            />
            <Textarea
              placeholder="Feedback message"
              className="min-h-[120px]"
              value={form.text}
              onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Select
                value={form.type}
                onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="coaching">Coaching</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Rating (optional)"
                value={form.rating}
                onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))}
              />
            </div>
            <Button onClick={handleSend} disabled={sending} className="rounded-2xl font-black">
              {sending ? "Sending..." : "Send Feedback"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading feedback...</div>
      ) : items.length === 0 ? (
        <Card className="border-none glass-card rounded-3xl">
          <CardContent className="p-10 text-center space-y-3">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-none glass-card rounded-2xl">
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg font-black">
                    {item.sender?.name || item.sender?.email || "System"}
                  </CardTitle>
                  <Badge className="text-[10px] uppercase tracking-widest bg-secondary/60 text-foreground border-none">
                    {item.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3">
                <p className="text-sm text-muted-foreground">{item.text}</p>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                  {item.rating !== null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-amber-500" /> {item.rating}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
