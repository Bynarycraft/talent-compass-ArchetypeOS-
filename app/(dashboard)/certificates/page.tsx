"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

type CertificateItem = {
  id: string;
  timestamp: string;
  targetId: string | null;
  details?: string | null;
};

export default function CertificatesPage() {
  const [items, setItems] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/certificates");
        if (res.ok) {
          setItems(await res.json());
        }
      } catch (_error) {
        console.error("Failed to load certificates");
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
          <Award className="h-7 w-7" /> Certificates
        </h1>
        <p className="text-muted-foreground mt-2 text-sm font-medium">
          Certificates earned from completed modules.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading certificates...</div>
      ) : items.length === 0 ? (
        <Card className="border-none glass-card rounded-3xl">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No certificates earned yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-none glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-black">Completion Certificate</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <div>Issued: {new Date(item.timestamp).toLocaleString()}</div>
                {item.details && <div>Details: {item.details}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
