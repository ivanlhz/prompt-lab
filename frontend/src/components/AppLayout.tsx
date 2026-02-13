import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Experiment", icon: IconExperiment },
  { to: "/history", label: "History", icon: IconHistory },
  { to: "/assets", label: "Assets", icon: IconAssets },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-app-bg text-app-text">
      <aside className="fixed left-0 top-0 z-10 flex h-full w-56 flex-col border-r border-app-border bg-app-sidebar">
        <div className="flex h-14 items-center gap-2 border-b border-app-border px-4">
          <span className="text-lg font-semibold tracking-tight">Promptlab</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-app-accent/15 text-app-accent"
                    : "text-app-subtext hover:bg-app-card hover:text-app-text"
                }`
              }
            >
              <Icon className="size-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="ml-56 flex min-h-screen flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function IconExperiment({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256" aria-hidden>
      <path d="M208 40a8 8 0 0 0-8-8H56a8 8 0 0 0-8 8v176a8 8 0 0 0 8 8h144a8 8 0 0 0 8-8V40Zm-8 176H56V48h144v168Zm-32-96a8 8 0 0 0-3.71-6.75l-32-20a8 8 0 0 0-8.58 13.5L140.43 112 84.71 153.25a8 8 0 1 0 8.58 13.5L128 141.43l34.71 25.32a8 8 0 0 0 8.58-13.5L140.43 112l35.86-26.25A8 8 0 0 0 168 120Z" />
    </svg>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256" aria-hidden>
      <path d="M136 128a8 8 0 0 1-8 8H88a8 8 0 0 1 0-16h32v-32a8 8 0 0 1 16 0v40a8 8 0 0 1-8 8Zm-8-96a96 96 0 1 0 96 96 96.11 96.11 0 0 0-96-96Zm0 176a80 80 0 1 1 80-80 80.09 80.09 0 0 1-80 80Z" />
    </svg>
  );
}

function IconAssets({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256" aria-hidden>
      <path d="M216 72h-48V48a24 24 0 0 0-24-24h-32a24 24 0 0 0-24 24v24H40a16 16 0 0 0-16 16v112a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V88a16 16 0 0 0-16-16ZM96 48a8 8 0 0 1 8-8h32a8 8 0 0 1 8 8v24H96Zm120 152H40V88h176v112Z" />
    </svg>
  );
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 256 256" aria-hidden>
      <path d="M232 128a8 8 0 0 0-5.34-7.57l-20.12-6.75a96.12 96.12 0 0 0 0-47.36l20.12-6.75a8 8 0 0 0 0-14.86l-56-20a8 8 0 0 0-5.32 0l-56 20a8 8 0 0 0 0 14.86l20.12 6.75a96.12 96.12 0 0 0 0 47.36l-20.12 6.75a8 8 0 0 0 0 14.86l56 20a8 8 0 0 0 5.32 0l56-20a8 8 0 0 0 5.34-7.57Zm-15.9-8.75-19.7-6.61a8 8 0 0 0-5 0 112.15 112.15 0 0 1 0-49.28 8 8 0 0 0 5 0l19.7-6.61 47.8 17.07-19.7 6.61a8 8 0 0 0-5 0 112.15 112.15 0 0 1 0 49.28 8 8 0 0 0 5 0l19.7 6.61ZM40.1 119.25l19.7 6.61a8 8 0 0 0 5 0 112.15 112.15 0 0 1 0-49.28 8 8 0 0 0-5 0l-19.7 6.61L21.3 102.18l19.7-6.61a8 8 0 0 0 5 0 112.15 112.15 0 0 1 0 49.28 8 8 0 0 0-5 0l-19.7-6.61 47.8-17.07ZM128 152a24 24 0 1 1 24-24 24 24 0 0 1-24 24Z" />
    </svg>
  );
}
