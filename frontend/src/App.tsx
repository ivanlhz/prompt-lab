import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ExperimentList from "./components/ExperimentList";
import ExperimentDetail from "./components/ExperimentDetail";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <p className="text-app-subtext">{title} — coming soon</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<ExperimentList />} />
        <Route path="/experiments/:id" element={<ExperimentDetail />} />
        <Route path="/history" element={<PlaceholderPage title="History" />} />
        <Route path="/assets" element={<PlaceholderPage title="Assets" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
