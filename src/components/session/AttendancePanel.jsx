
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import moment from "moment";

const SUSTAINED_LABEL = "sustained presence ≥ 5 min";

/**
 * @param {number} seconds
 * @returns {string}
 */
function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * @typedef {Object} Student
 * @property {string | number} id
 * @property {string} name
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string | number} student_id
 * @property {string} [status]
 * @property {number} [present_seconds]
 * @property {boolean} [is_checked_in]
 * @property {string} [checked_in_at]
 * @property {string} [first_seen]
 * @property {boolean} [late]
 */

/**
 * @param {{
 *   students: Student[],
 *   attendance: AttendanceRecord[],
 *   active: boolean,
 *   onCheckIn: (student: Student) => void,
 *   onCheckOut: (student: Student) => void
 * }} props
 */
export default function AttendancePanel({
  students = [],
  attendance = [],
  active = false,
  onCheckIn,
  onCheckOut,
}) {
  const recordFor = (studentId) =>
    attendance.find((a) => a.student_id === studentId);

  const liveSeconds = (rec) => {
    if (!rec) return 0;

    let secs = rec.present_seconds || 0;

    if (rec.is_checked_in && rec.checked_in_at) {
      secs +=
        (Date.now() - new Date(rec.checked_in_at).getTime()) / 1000;
    }

    return secs;
  };

  const presentCount = attendance.filter(
    (a) => a.status === "present"
  ).length;

  const partialCount = attendance.filter(
    (a) => a.status === "partial"
  ).length;

  const notSeen = Math.max(0, students.length - attendance.length);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">
          Attendance — Sustained Presence
        </CardTitle>

        <CardDescription>
          {presentCount} present · {partialCount} brief/partial · {notSeen} not seen — {SUSTAINED_LABEL}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {students.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No students in this classroom yet — add them from the Students page.
          </p>
        )}

        {students.map((student) => {
          const rec = recordFor(student.id);
          const secs = liveSeconds(rec);

          return (
            <div
              key={student.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{student.name}</p>

                <p className="text-xs text-muted-foreground">
                  {rec ? `Present ${fmt(secs)}` : "Not seen"} · first seen{" "}
                  {rec?.first_seen
                    ? moment(rec.first_seen).format("h:mm A")
                    : "—"}
                  {rec?.late ? " · late" : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {rec?.status === "present" ? (
                  <Badge>Present</Badge>
                ) : rec ? (
                  <Badge variant="secondary">Partial</Badge>
                ) : (
                  <Badge variant="outline">Absent</Badge>
                )}

                {active && (!rec || !rec.is_checked_in) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCheckIn?.(student)}
                  >
                    <LogIn className="mr-1 h-3.5 w-3.5" />
                    Check in
                  </Button>
                )}

                {rec?.is_checked_in && (
                  <Button
                    size="sm"
                    onClick={() => onCheckOut?.(student)}
                  >
                    <LogOut className="mr-1 h-3.5 w-3.5" />
                    Check out
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
