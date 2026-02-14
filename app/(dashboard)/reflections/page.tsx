"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Notebook, CalendarClock } from "lucide-react";

type ReflectionItem = {
  id: string;
  text: string;
  mood: string | null;
  createdAt: string;
  learningSession?: {
    id: string;
    startTime: string;
    endTime: string | null;
    durationMinutes: number | null;
  } | null;
  comments?: Array<{
    id: string;
    text: string;
    createdAt: string;
    sender?: { name?: string | null; email?: string | null } | null;
  }>;
};

export default function ReflectionsPage() {
  const [items, setItems] = useState<ReflectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/reflections?includeComments=1");
        if (res.ok) {
          setItems(await res.json());
        }
      } catch (_error) {
        console.error("Failed to load reflections");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient flex items-center gap-3">
          <Notebook className="h-7 w-7" /> Reflections
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Daily reflections captured after learning sessions.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading reflections...</div>
      ) : items.length === 0 ? (
        <Card className="border-none glass-card rounded-3xl">
          <CardContent className="p-10 text-center space-y-3">
            <Notebook className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No reflections yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-none glass-card rounded-2xl">
              <CardHeader className="p-6 pb-2">
                <CardTitle className="text-lg font-black">Session Reflection</CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-2 space-y-3">
                <p className="text-sm text-muted-foreground">{item.text}</p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-3 w-3" /> {new Date(item.createdAt).toLocaleString()}
                  </span>
                  {item.mood && <span>Mood: {item.mood}</span>}
                  {item.learningSession?.durationMinutes && (
                    <span>Duration: {item.learningSession.durationMinutes}m</span>
                  )}
                </div>
                {item.comments && item.comments.length > 0 && (
                  <div className="rounded-2xl border border-border/30 p-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Supervisor Comments</p>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
