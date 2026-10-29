import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./routes";
import { DashboardSidebarContext } from "@/components/shared/navigation/DashboardSidebarContext";

function App() {
  const sidebarState = useState(false);

  return (
    <DashboardSidebarContext.Provider value={sidebarState}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DashboardSidebarContext.Provider>
  );
}

export default App;
