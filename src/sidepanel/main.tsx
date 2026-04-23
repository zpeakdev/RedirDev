import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme, App } from "antd";
import SidePanel from "./App.tsx";
import "@/assets/styles/tailwind.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.compactAlgorithm,
        token: {
          fontSize: 13,
          controlHeight: 32,
        },
      }}
    >
      <App>
        <SidePanel />
      </App>
    </ConfigProvider>
  </StrictMode>,
);
