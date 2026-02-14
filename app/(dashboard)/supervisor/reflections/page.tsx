"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Notebook } from "lucide-react";
import { toast } from "sonner";

type Learner = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

type ReflectionItem = {
  id: string;
  text: string;
  createdAt: string;
  comments?: Array<{
    id: string;
    text: string;
    createdAt: string;
    sender?: { name?: string | null; email?: string | null } | null;
  }>;
};

export default function SupervisorReflectionsPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState("");
  const [items, setItems] = useState<ReflectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/supervisor/learners");
        if (res.ok) {
          const data = await res.json();
          setLearners(data);
        }
      } catch (_error) {
        toast.error("Failed to load learners");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const fetchReflections = async (userId: string) => {
    try {
      const res = await fetch(`/api/reflections?userId=${userId}&includeComments=1`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (_error) {
      toast.error("Failed to load reflections");
    }
  };

  const handleComment = async (reflectionId: string) => {
    const text = commentInputs[reflectionId];
    if (!text) {
      toast.error("Add a comment first");
      return;
    }

    setSending((prev) => ({ ...prev, [reflectionId]: true }));
    try {
      const res = await fetch(`/api/reflections/${reflectionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        toast.success("Comment added");
        setCommentInputs((prev) => ({ ...prev, [reflectionId]: "" }));
        if (selectedLearner) {
          fetchReflections(selectedLearner);
        }
      } else {
        toast.error("Failed to add comment");
      }
    } catch (_error) {
      toast.error("Failed to add comment");
    } finally {
      setSending((prev) => ({ ...prev, [reflectionId]: false }));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient flex items-center gap-3">
          <Notebook className="h-7 w-7" /> Reflection Review
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Review learner reflections and leave coaching feedback.
        </p>
      </div>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Select Learner</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedLearner}
            onValueChange={(value) => {
              setSelectedLearner(value);
              fetchReflections(value);
            }}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose learner" />
            </SelectTrigger>
            <SelectContent>
              {learners.map((learner) => (
                <SelectItem key={learner.id} value={learner.id}>
                  {learner.name || learner.email} ({learner.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedLearner && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <Card className="border-none glass-card rounded-3xl">
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No reflections logged yet.
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="border-none glass-card rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black">Reflection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                  {item.comments && item.comments.length > 0 && (
                    <div className="rounded-2xl border border-border/30 p-4 space-y-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Comments</p>
                      {item.comments.map((comment) => (
                        <div key={comment.id} className="text-sm">
                          <span className="font-bold">
                            {comment.sender?.name || comment.sender?.email || "Supervisor"}:
                          </span>{" "}
                          <span className="text-muted-foreground">{comment.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Leave coaching feedback..."
                      value={commentInputs[item.id] || ""}
                      onChange={(event) =>
                        setCommentInputs((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      className="min-h-[100px]"
                    />
                    <Button
                      onClick={() => handleComment(item.id)}
                      disabled={sending[item.id]}
                      className="rounded-2xl font-black"
                    >
                      {sending[item.id] ? "Sending..." : "Add Comment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
