import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider, theme, App } from "antd";
import Popup from "./popup.tsx";
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
        <Popup />
      </App>
    </ConfigProvider>
  </StrictMode>,
);
