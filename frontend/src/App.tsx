import { Routes, Route } from "react-router-dom";
import ExperimentList from "./components/ExperimentList";
import ExperimentDetail from "./components/ExperimentDetail";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4">
        <a href="/" className="text-xl font-bold tracking-tight">
          Prompt Lab
        </a>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<ExperimentList />} />
          <Route path="/experiments/:id" element={<ExperimentDetail />} />
        </Routes>
      </main>
    </div>
  );
}
