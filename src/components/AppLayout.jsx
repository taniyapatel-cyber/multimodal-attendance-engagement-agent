import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, CalendarClock, Users, LogOut, BrainCircuit } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sessions", label: "Sessions", icon: CalendarClock },
  { to: "/students", label: "Students", icon: Users },
];

export default function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await base44.auth.logout("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card">
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold leading-tight">Engage Agent</p>
              <p className="text-xs text-muted-foreground">Classroom intelligence</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-heading text-sm font-semibold">Engage Agent</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `rounded-md p-2 ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`
                }
                aria-label={item.label}
              >
                <item.icon className="h-4 w-4" />
              </NavLink>
            ))}
            <button onClick={handleLogout} className="rounded-md p-2 text-muted-foreground" aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <main className="flex-1 px-4 pb-24 pt-20 md:px-8 md:pb-10 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}