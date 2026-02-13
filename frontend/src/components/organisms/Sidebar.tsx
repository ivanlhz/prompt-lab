import { IconExperiment, IconHistory, IconAssets, IconSettings } from "../atoms/Icons";
import NavItem from "../molecules/NavItem";

const navItems = [
  { to: "/", label: "Experiment", icon: <IconExperiment /> },
  { to: "/history", label: "History", icon: <IconHistory /> },
  { to: "/assets", label: "Assets", icon: <IconAssets /> },
  { to: "/settings", label: "Settings", icon: <IconSettings /> },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-10 flex h-full w-56 flex-col border-r border-app-border bg-app-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-app-border px-4">
        <span className="text-lg font-semibold tracking-tight">Prompt Lab</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {navItems.map(({ to, label, icon }) => (
          <NavItem key={to} to={to} label={label} icon={icon} end={to === "/"} />
        ))}
      </nav>
    </aside>
  );
}
