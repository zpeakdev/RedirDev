import { useStorageState } from "@/shared/hooks/useStorageState";
import { Switch, Tag, Space, Typography, App } from "antd";
import { getErrorMessage } from "@/utils/index.ts";

const { Title, Text } = Typography;

const HeaderBar = () => {
  const { enabled, updateEnabled } = useStorageState();

  /**
   * 切换全局拦截开关
   */
  function handleEnabledChange(enabled: boolean): void {
    const { message } = App.useApp();
    updateEnabled(enabled)
      .then(() => message.success(`已切换到${enabled ? "启用" : "禁用"}状态`))
      .catch((err) => message.error(`切换失败：${getErrorMessage(err)}`));
  }
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
            onChange={handleEnabledChange}
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
