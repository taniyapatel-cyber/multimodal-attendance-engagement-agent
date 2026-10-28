import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-semibold leading-tight">{value}</p>
          {sublabel && <p className="truncate text-xs text-muted-foreground">{sublabel}</p>}
        </div>
      </CardContent>
    </Card>
  );
}