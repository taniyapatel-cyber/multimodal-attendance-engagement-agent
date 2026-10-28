import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EngagementChart from "@/components/dashboard/EngagementChart";

const AUDIO_SCORES = { low: 40, medium: 70, high: 100 };

export default function EngagementPanel({ samples, elapsedMinutes, active, onSubmit }) {
  const lastEnd = samples.length ? samples[samples.length - 1].interval_end : 0;
  const nextEnd = Math.max(lastEnd + 5, Math.min(lastEnd + 10, Math.max(10, Math.round(elapsedMinutes))));

  const [attention, setAttention] = useState(75);
  const [movement, setMovement] = useState(50);
  const [inactivity, setInactivity] = useState(2);
  const [audio, setAudio] = useState("medium");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fused = Math.round(
    0.6 * attention + 0.2 * (100 - Math.min(inactivity * 10, 100)) + 0.2 * AUDIO_SCORES[audio]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSubmit({
        interval_start: lastEnd,
        interval_end: nextEnd,
        attention_score: attention,
        movement_score: movement,
        inactivity_minutes: Number(inactivity),
        audio_activity: audio,
        engagement: fused,
        note: note || null,
      });
      setNote("");
    } finally {
      setSaving(false);
    }
  };

  const chartData = samples.map((s) => ({
    label: `${s.interval_start}-${s.interval_end}m`,
    engagement: Math.round(s.engagement),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Engagement — Session Dynamics</CardTitle>
        <CardDescription>Multimodal fusion of attention, movement, inactivity and audio signals per interval</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {chartData.length > 0 ? (
          <EngagementChart data={chartData} />
        ) : (
          <p className="text-sm text-muted-foreground">No intervals logged yet — record the first interval below.</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
          <p className="text-sm font-medium">
            Log interval {lastEnd}–{nextEnd} min{active ? "" : " (session completed — read-only)"}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>Head-pose attention</Label>
              <span className="text-muted-foreground">{attention}%</span>
            </div>
            <Slider min={0} max={100} step={5} value={[attention]} onValueChange={(v) => setAttention(v[0])} disabled={!active} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>Movement level</Label>
              <span className="text-muted-foreground">{movement}%</span>
            </div>
            <Slider min={0} max={100} step={5} value={[movement]} onValueChange={(v) => setMovement(v[0])} disabled={!active} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inactivity">Inactivity (min)</Label>
              <Input
                id="inactivity"
                type="number"
                min={0}
                max={30}
                value={inactivity}
                onChange={(e) => setInactivity(Number(e.target.value))}
                disabled={!active}
              />
            </div>
            <div className="space-y-2">
              <Label>Audio activity</Label>
              <Select value={audio} onValueChange={setAudio} disabled={!active}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Observation (optional)</Label>
            <Textarea
              id="note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!active}
              placeholder="e.g. quiet during derivation, Q&A picked up after the example"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Fused engagement: <span className="font-semibold text-foreground">{fused}%</span>
            </p>
            <Button type="submit" size="sm" disabled={!active || saving}>
              {saving ? "Saving..." : "Log interval"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}