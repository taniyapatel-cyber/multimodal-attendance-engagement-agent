import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { School, UserPlus } from "lucide-react";

export default function Students() {
  const [classrooms, setClassrooms] = useState(null);
  const [selectedClassroomId, setSelectedClassroomId] = useState("");
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({});
  const [sessionCount, setSessionCount] = useState(0);
  const [classroomForm, setClassroomForm] = useState({ name: "", subject: "" });
  const [studentForm, setStudentForm] = useState({ name: "", roll_number: "", classroom_id: "" });
  const [busy, setBusy] = useState(false);

  const loadClassrooms = useCallback(async () => {
    const page = await base44.entities.Classroom.filter({}, { limit: 100 });
    const items = page.items || [];
    setClassrooms(items);
    return items;
  }, []);

  const loadStudentsFor = useCallback(async (classroomId) => {
    const [studentPage, count] = await Promise.all([
      base44.entities.Student.filter({ classroom_id: classroomId }, { sort: "name", limit: 200 }),
      base44.entities.ClassSession.count({ classroom_id: classroomId }),
    ]);
    const items = studentPage.items || [];
    const ids = items.map((s) => s.id);
    let totals = {};
    if (ids.length) {
      const [trackedAgg, presentAgg] = await Promise.all([
        base44.entities.AttendanceRecord.aggregate({ query: { student_id: { $in: ids } }, groupBy: "student_id" }),
        base44.entities.AttendanceRecord.aggregate({
          query: { student_id: { $in: ids }, status: "present" },
          groupBy: "student_id",
        }),
      ]);
      trackedAgg.rows.forEach((r) => {
        totals[r.student_id] = { tracked: r.count, present: 0 };
      });
      presentAgg.rows.forEach((r) => {
        totals[r.student_id] = { tracked: totals[r.student_id]?.tracked || 0, present: r.count };
      });
    }
    setStudents(items);
    setStats(totals);
    setSessionCount(count);
  }, []);

  useEffect(() => {
    (async () => {
      const items = await loadClassrooms();
      if (items.length) setSelectedClassroomId(items[0].id);
    })();
  }, [loadClassrooms]);

  useEffect(() => {
    if (selectedClassroomId) loadStudentsFor(selectedClassroomId);
  }, [selectedClassroomId, loadStudentsFor]);

  const handleAddClassroom = async (e) => {
    e.preventDefault();
    if (!classroomForm.name) return;
    setBusy(true);
    try {
      const c = await base44.entities.Classroom.create({
        name: classroomForm.name,
        subject: classroomForm.subject || null,
      });
      setClassroomForm({ name: "", subject: "" });
      await loadClassrooms();
      setSelectedClassroomId(c.id);
    } finally {
      setBusy(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.classroom_id) return;
    setBusy(true);
    try {
      await base44.entities.Student.create({
        name: studentForm.name,
        roll_number: studentForm.roll_number || null,
        classroom_id: studentForm.classroom_id,
      });
      setStudentForm({ name: "", roll_number: "", classroom_id: studentForm.classroom_id });
      if (studentForm.classroom_id === selectedClassroomId) {
        await loadStudentsFor(studentForm.classroom_id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Students &amp; Classrooms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage rosters and review per-student attendance analytics based on sustained presence.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <School className="h-4 w-4 text-primary" /> Add Classroom
            </CardTitle>
            <CardDescription>Create a class roster to run sessions against</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddClassroom} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="cname">Classroom name</Label>
                <Input
                  id="cname"
                  value={classroomForm.name}
                  onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                  placeholder="e.g. Data Structures"
                  required
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="csubject">Subject</Label>
                <Input
                  id="csubject"
                  value={classroomForm.subject}
                  onChange={(e) => setClassroomForm({ ...classroomForm, subject: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <Button type="submit" disabled={busy}>Add</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading">
              <UserPlus className="h-4 w-4 text-primary" /> Add Student
            </CardTitle>
            <CardDescription>Enroll a student into a classroom roster</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="sname">Student name</Label>
                  <Input
                    id="sname"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="w-full space-y-2 sm:w-32">
                  <Label htmlFor="sroll">Roll no.</Label>
                  <Input
                    id="sroll"
                    value={studentForm.roll_number}
                    onChange={(e) => setStudentForm({ ...studentForm, roll_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Classroom</Label>
                  <Select
                    value={studentForm.classroom_id}
                    onValueChange={(v) => setStudentForm({ ...studentForm, classroom_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {(classrooms || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={busy || !classrooms?.length}>Add</Button>
              </div>
              {classrooms !== null && classrooms.length === 0 && (
                <p className="text-xs text-muted-foreground">Create a classroom first.</p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="font-heading">Student Analytics</CardTitle>
            <CardDescription>
              Attendance rate = sessions with sustained presence ÷ total sessions in the classroom
            </CardDescription>
          </div>
          <div className="w-52">
            <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
              <SelectTrigger>
                <SelectValue placeholder="Classroom" />
              </SelectTrigger>
              <SelectContent>
                {(classrooms || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No students in this classroom yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll no.</TableHead>
                  <TableHead>Sessions attended</TableHead>
                  <TableHead>Attendance rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => {
                  const stat = stats[s.id] || { present: 0, tracked: 0 };
                  const rate = sessionCount ? Math.round((stat.present / sessionCount) * 100) : null;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.roll_number || "—"}</TableCell>
                      <TableCell>
                        {stat.present} / {sessionCount}
                      </TableCell>
                      <TableCell>{rate != null ? `${rate}%` : "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}