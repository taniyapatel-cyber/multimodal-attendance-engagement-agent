import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronRight } from "lucide-react";

export default function Sessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", classroomId: "", classroomName: "", subject: "", duration: "60" });

  useEffect(() => {
    (async () => {
      const [sessionPage, classroomPage] = await Promise.all([
        base44.entities.ClassSession.filter({}, { sort: "-created_date", limit: 50 }),
        base44.entities.Classroom.filter({}, { limit: 100 }),
      ]);
      setSessions(sessionPage.items || []);
      setClassrooms(classroomPage.items || []);
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || (!form.classroomId && !form.classroomName)) return;
    setCreating(true);
    try {
      let classroomId = form.classroomId;
      let classroomName = form.classroomName;
      if (form.classroomId === "__new__") {
        const c = await base44.entities.Classroom.create({ name: form.classroomName, subject: form.subject || null });
        classroomId = c.id;
        classroomName = c.name;
      } else if (classroomId) {
        classroomName = classrooms.find((c) => c.id === classroomId)?.name || "";
      }
      const s = await base44.entities.ClassSession.create({
        title: form.title,
        classroom_id: classroomId,
        classroom_name: classroomName,
        date: new Date().toISOString(),
        duration_minutes: Number(form.duration) || 60,
        status: "active",
      });
      setOpen(false);
      navigate(`/sessions/${s.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Start a live session or review completed classroom activity.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="font-heading">All Sessions</CardTitle>
            <CardDescription>Attendance, engagement and AI insights per session</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> New session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a new session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Data Structures — Lecture 8"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Classroom</Label>
                  <Select value={form.classroomId} onValueChange={(v) => setForm({ ...form, classroomId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ New classroom…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.classroomId === "__new__" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cname">Classroom name</Label>
                      <Input
                        id="cname"
                        value={form.classroomName}
                        onChange={(e) => setForm({ ...form, classroomName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="duration">Planned duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={10}
                    max={240}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Starting..." : "Start session"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions === null && (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          )}
          {sessions !== null && sessions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions yet — start your first live session to track attendance and engagement.
            </p>
          )}
          {sessions?.map((s) => (
            <Link
              key={s.id}
              to={`/sessions/${s.id}`}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.classroom_name} · {moment(s.date).format("MMM D, YYYY")} ·{" "}
                  {s.avg_engagement != null ? `${Math.round(s.avg_engagement)}% avg engagement` : "engagement pending"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.status === "active" ? <Badge>Active</Badge> : <Badge variant="secondary">Completed</Badge>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}