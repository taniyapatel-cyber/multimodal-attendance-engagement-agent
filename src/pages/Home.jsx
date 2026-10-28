import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import moment from "moment";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarClock, Activity, TrendingUp, ShieldCheck, Plus, ChevronRight } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import EngagementChart from "@/components/dashboard/EngagementChart";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sessions: 0,
    students: 0,
    attendanceRate: null,
    avgEngagement: null,
  });
  const [recentSessions, setRecentSessions] = useState([]);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessionCount, studentCount, attendanceAgg, engagementAgg, recentPage] = await Promise.all([
          base44.entities.ClassSession.count({}),
          base44.entities.Student.count({}),
          base44.entities.AttendanceRecord.aggregate({ groupBy: "status" }),
          base44.entities.EngagementSample.aggregate({ avg: ["engagement"] }),
          base44.entities.ClassSession.filter({}, { sort: "-created_date", limit: 5 }),
        ]);
        if (cancelled) return;

        const byStatus = {};
        (attendanceAgg.rows || []).forEach((r) => {
          byStatus[r.status] = r.count;
        });
        const tracked = (byStatus.present || 0) + (byStatus.partial || 0);
        const avgEngagement = engagementAgg.rows?.[0]?.avg_engagement;

        setStats({
          sessions: sessionCount,
          students: studentCount,
          attendanceRate: tracked ? Math.round(((byStatus.present || 0) / tracked) * 100) : null,
          avgEngagement: avgEngagement != null ? Math.round(avgEngagement) : null,
        });

        const sessions = recentPage.items || [];
        setRecentSessions(sessions);
        if (sessions.length) {
          const samplePage = await base44.entities.EngagementSample.filter(
            { session_id: sessions[0].id },
            { sort: "interval_start", limit: 50 }
          );
          if (!cancelled) {
            setTrend(
              (samplePage.items || []).map((s) => ({
                label: `${s.interval_start}-${s.interval_end}m`,
                engagement: Math.round(s.engagement),
              }))
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Multimodal Attendance &amp; Engagement Agent</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">
          AI-powered, privacy-preserving classroom intelligence: sustained-presence attendance, multimodal
          engagement trends, and teaching suggestions for educators.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarClock}
          label="Sessions"
          value={String(stats.sessions)}
          sublabel="Live and completed"
        />
        <StatCard
          icon={Activity}
          label="Avg. Engagement"
          value={stats.avgEngagement != null ? `${stats.avgEngagement}%` : "—"}
          sublabel="Fused multimodal score"
        />
        <StatCard
          icon={TrendingUp}
          label="Attendance Rate"
          value={stats.attendanceRate != null ? `${stats.attendanceRate}%` : "—"}
          sublabel="Sustained presence based"
        />
        <StatCard icon={Users} label="Students" value={String(stats.students)} sublabel="Across all classrooms" />
      </div>

      {stats.sessions === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              No sessions yet. Start a live session to track sustained-presence attendance, log multimodal
              engagement intervals, and generate AI-driven teaching suggestions.
            </p>
            <Button asChild>
              <Link to="/sessions">
                <Plus className="mr-2 h-4 w-4" /> Start your first session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading">Engagement Overview</CardTitle>
              <CardDescription>
                {recentSessions[0]
                  ? `${recentSessions[0].title} — fused attention, movement and audio signals`
                  : "Fused signals across the latest session"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trend.length ? (
                <EngagementChart data={trend} />
              ) : (
                <p className="text-sm text-muted-foreground">No engagement intervals recorded yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Recent Sessions</CardTitle>
              <CardDescription>Latest classroom activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.classroom_name} · {moment(session.date).format("MMM D")} ·{" "}
                      {session.avg_engagement != null ? `${Math.round(session.avg_engagement)}% engagement` : "pending"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Signals are processed into aggregate engagement trends — no raw video or audio is stored, keeping the
          system privacy-preserving and suitable for offline, ethical deployment.
        </p>
      </div>
    </div>
  );
}