import { StrictMode } from "react";
import { ConfigProvider, theme, App } from "antd";
import ReactDOM from 'react-dom/client'
import Options from './App'
import "@/assets/styles/tailwind.css";

ReactDOM.createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.compactAlgorithm,
        token: {
          fontSize: 13,
          controlHeight: 32
        }
      }}
    >
      <App>
        <Options />
      </App>
    </ConfigProvider>
  </StrictMode>,
)
