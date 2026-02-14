"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles } from "lucide-react";

type Skill = {
  name: string;
  level: number;
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/skills");
        if (res.ok) {
          setSkills(await res.json());
        }
      } catch (_error) {
        console.error("Failed to load skills");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const readinessScore = useMemo(() => {
    if (skills.length === 0) return 0;
    const avg = skills.reduce((acc, skill) => acc + skill.level, 0) / skills.length;
    return Math.round((avg / 5) * 100);
  }, [skills]);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient flex items-center gap-3">
          <Brain className="h-7 w-7" /> Skill Map
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Intelligence layer built from learning + assessments.
        </p>
      </div>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Readiness Score</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="text-4xl font-black">{readinessScore}%</div>
          <p className="text-sm text-muted-foreground">Overall readiness based on completed learning and test scores.</p>
        </CardContent>
      </Card>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Skill Progression</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading skills...</div>
          ) : skills.length === 0 ? (
            <div className="text-sm text-muted-foreground">No skills calculated yet.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {skills.map((skill) => (
                <div key={skill.name} className="rounded-2xl border border-border/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{skill.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Level {skill.level.toFixed(1)} / 5
                      </p>
                    </div>
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-3 h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.min(100, (skill.level / 5) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
