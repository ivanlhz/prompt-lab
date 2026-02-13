import { Outlet } from "react-router-dom";
import Sidebar from "../organisms/Sidebar";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-app-bg text-app-text">
      <Sidebar />
      <main className="ml-56 flex min-h-screen flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
