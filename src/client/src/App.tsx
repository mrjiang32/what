import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<LoginPage />} path="/login" />
      <Route element={<DashboardPage/>} path="/dashboard" />
    </Routes>
  );
}

export default App;
