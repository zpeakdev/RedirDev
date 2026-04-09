import { Switch, Tag, Space, Typography } from "antd";
import type { FC } from "react";

const { Title, Text } = Typography;

interface HeaderBarProps {
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
}

const HeaderBar: FC<HeaderBarProps> = ({ enabled, onEnabledChange }) => {
  return (
    <header className="rounded-xl px-6 py-4 flex items-center justify-between"
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "#fff"
      }}
    >
      <div>
        <Title level={3} className="m-0! text-white! text-xl" style={{ color: "#fff" }}>
          API 拦截与代理管理
        </Title>
        <Text className="opacity-90 text-xs" style={{ color: "rgba(255,255,255,0.9)" }}>
          管理接口拦截规则，重定向到本地服务
        </Text>
      </div>

      <Space size="middle" align="center">
        <Space size={4}>
          <Text className="text-white text-sm">全局拦截</Text>
          <Switch
            checked={enabled}
            checkedChildren="开"
            unCheckedChildren="关"
            onChange={onEnabledChange}
          />
        </Space>
        <Tag
          color={enabled ? "success" : "default"}
          variant="outlined"
          className="m-0"
        >
          {enabled ? "运行中" : "已暂停"}
        </Tag>
      </Space>
    </header>
  );
};

export default HeaderBar;
