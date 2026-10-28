import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

function priorityVariant(priority) {
  if (priority === "high") return "destructive";
  if (priority === "low") return "secondary";
  return "default";
}

export default function SuggestionsPanel({ suggestions, generating, onGenerate, error, disabled }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="font-heading">AI Teaching Suggestions</CardTitle>
          <CardDescription>Context-aware, assistive decision support — recommendations, never enforced decisions</CardDescription>
        </div>
        <Button size="sm" onClick={onGenerate} disabled={generating || disabled}>
          <Sparkles className="mr-2 h-4 w-4" />
          {generating ? "Analyzing..." : suggestions.length ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && suggestions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Log a few engagement intervals, then generate AI-driven suggestions based on the detected patterns.
          </p>
        )}
        {suggestions.map((s) => (
          <div key={s.id} className="rounded-lg border p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <Badge variant={priorityVariant(s.priority)}>{s.priority}</Badge>
              <span className="text-xs capitalize text-muted-foreground">{s.type}</span>
            </div>
            <p className="text-sm leading-relaxed">{s.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}