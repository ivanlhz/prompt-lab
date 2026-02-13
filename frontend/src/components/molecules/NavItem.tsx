import { NavLink } from "react-router-dom";

interface Props {
  to: string;
  label: string;
  icon: React.ReactNode;
  end?: boolean;
}

export default function NavItem({ to, label, icon, end }: Props) {
  return (
    <NavLink
      to={to}
      end={end ?? to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? "bg-app-accent/15 text-app-accent"
            : "text-app-subtext hover:bg-app-card hover:text-app-text"
        }`
      }
    >
      <span className="size-5 shrink-0 [&>svg]:size-full">{icon}</span>
      {label}
    </NavLink>
  );
}
