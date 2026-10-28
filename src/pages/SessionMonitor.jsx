import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Timer, Flag } from "lucide-react";
import AttendancePanel from "@/components/session/AttendancePanel";
import EngagementPanel from "@/components/session/EngagementPanel";
import SuggestionsPanel from "@/components/session/SuggestionsPanel";

const SUSTAINED_SECONDS = 300;
const LATE_MINUTES = 10;

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SessionMonitor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [samples, setSamples] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await base44.entities.ClassSession.get(id).catch((e) =>
          e.status === 404 ? null : Promise.reject(e)
        );
        if (!s) {
          if (!cancelled) setLoading(false);
          return;
        }
        const [studentPage, attendancePage, samplePage, suggestionPage] = await Promise.all([
          base44.entities.Student.filter({ classroom_id: s.classroom_id }, { limit: 200 }),
          base44.entities.AttendanceRecord.filter({ session_id: id }, { limit: 200 }),
          base44.entities.EngagementSample.filter({ session_id: id }, { sort: "interval_start", limit: 100 }),
          base44.entities.Suggestion.filter({ session_id: id }, { sort: "-created_date", limit: 20 }),
        ]);
        if (cancelled) return;
        setSession(s);
        setStudents(studentPage.items || []);
        setAttendance(attendancePage.items || []);
        setSamples(samplePage.items || []);
        setSuggestions(suggestionPage.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isActive = session?.status === "active";
  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const elapsedSeconds = session ? Math.max(0, (now - new Date(session.created_date).getTime()) / 1000) : 0;
  const elapsedMinutes = elapsedSeconds / 60;

  const findRecord = (studentId) => attendance.find((a) => a.student_id === studentId);

  const handleCheckIn = async (student) => {
    const ts = new Date().toISOString();
    const existing = findRecord(student.id);
    if (existing) {
      const updated = await base44.entities.AttendanceRecord.update(existing.id, {
        is_checked_in: true,
        checked_in_at: ts,
        late: existing.late || elapsedMinutes > LATE_MINUTES,
      });
      setAttendance((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      const created = await base44.entities.AttendanceRecord.create({
        session_id: id,
        student_id: student.id,
        student_name: student.name,
        first_seen: ts,
        checked_in_at: ts,
        is_checked_in: true,
        present_seconds: 0,
        late: elapsedMinutes > LATE_MINUTES,
        status: "partial",
        sustained_presence: false,
      });
      setAttendance((prev) => [...prev, created]);
    }
  };

  const checkOutRecord = async (rec) => {
    const delta = rec.checked_in_at ? (Date.now() - new Date(rec.checked_in_at).getTime()) / 1000 : 0;
    const total = Math.round((rec.present_seconds || 0) + delta);
    const updated = await base44.entities.AttendanceRecord.update(rec.id, {
      present_seconds: total,
      last_seen: new Date().toISOString(),
      is_checked_in: false,
      checked_in_at: null,
      sustained_presence: total >= SUSTAINED_SECONDS,
      status: total >= SUSTAINED_SECONDS ? "present" : "partial",
    });
    setAttendance((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    return updated;
  };

  const handleCheckOut = async (student) => {
    const rec = findRecord(student.id);
    if (rec && rec.is_checked_in) await checkOutRecord(rec);
  };

  const handleLogSample = async (data) => {
    const created = await base44.entities.EngagementSample.create({ session_id: id, ...data });
    setSamples((prev) => [...prev, created].sort((a, b) => a.interval_start - b.interval_start));
  };

  const handleEndSession = async () => {
    setEnding(true);
    try {
      await Promise.all(attendance.filter((a) => a.is_checked_in).map((a) => checkOutRecord(a)));
      const avg = samples.length
        ? Math.round(samples.reduce((sum, s) => sum + (s.engagement || 0), 0) / samples.length)
        : null;
      await base44.entities.ClassSession.update(id, { status: "completed", avg_engagement: avg });
      navigate("/sessions");
    } finally {
      setEnding(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setSuggestionError(null);
    try {
      const res = await base44.functions.invoke("generateSessionInsights", { sessionId: id });
      setSuggestions(res.data.suggestions || []);
    } catch (error) {
      setSuggestionError(error?.response?.data?.error || "Could not generate suggestions — try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-lg font-medium">Session not found.</p>
        <Button variant="outline" onClick={() => navigate("/sessions")}>Back to sessions</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">{session.title}</h1>
            {isActive ? <Badge>Active</Badge> : <Badge variant="secondary">Completed</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {session.classroom_name} · {moment(session.date).format("MMM D, YYYY")} · planned {session.duration_minutes} min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Timer className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm">{fmt(elapsedSeconds)}</span>
          </div>
          {isActive ? (
            <Button variant="destructive" onClick={handleEndSession} disabled={ending}>
              <Flag className="mr-2 h-4 w-4" />
              {ending ? "Ending..." : "End session"}
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/sessions">Back to sessions</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AttendancePanel
          students={students}
          attendance={attendance}
          active={isActive}
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
        <EngagementPanel samples={samples} elapsedMinutes={elapsedMinutes} active={isActive} onSubmit={handleLogSample} />
      </div>

      <SuggestionsPanel
        suggestions={suggestions}
        generating={generating}
        onGenerate={handleGenerate}
        error={suggestionError}
        disabled={!samples.length}
      />
    </div>
  );
}