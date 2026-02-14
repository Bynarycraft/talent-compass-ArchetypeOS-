"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";
import { toast } from "sonner";

type Result = {
  user: { id: string; name: string | null; email: string | null; role: string };
  skills: { name: string; level: number }[];
};

export default function AdminSkillSearchPage() {
  const [skills, setSkills] = useState("");
  const [mode, setMode] = useState("and");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!skills.trim()) {
      toast.error("Enter at least one skill");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/skills/search?skills=${encodeURIComponent(skills)}&mode=${mode}`);
      if (res.ok) {
        setResults(await res.json());
      } else {
        toast.error("Search failed");
      }
    } catch (_error) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="pb-2 border-b border-border/10">
        <h1 className="text-4xl font-black tracking-tight text-gradient flex items-center gap-3">
          <Brain className="h-7 w-7" /> Skill Search
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Query users by skill combinations.
        </p>
      </div>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Skills (comma separated)"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
          />
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger>
              <SelectValue placeholder="Match mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">Match all</SelectItem>
              <SelectItem value="or">Match any</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSearch} disabled={loading} className="rounded-2xl font-black">
            {loading ? "Searching..." : "Search"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none glass-card rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black">Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {results.length === 0 ? (
            <div className="text-sm text-muted-foreground">No results yet.</div>
          ) : (
            results.map((result) => (
              <div key={result.user.id} className="rounded-2xl border border-border/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm">{result.user.name || result.user.email}</p>
                  <Badge variant="outline">{result.user.role}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.skills.map((skill) => (
                    <Badge key={skill.name} className="bg-secondary/60 text-foreground border-none">
                      {skill.name} · {skill.level.toFixed(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
