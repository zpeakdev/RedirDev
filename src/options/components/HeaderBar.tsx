import { useStorageState } from "@/shared/hooks/useStorageState";
import { Switch, Space, Typography, App, Badge, Tag, Divider } from "antd";
import { getErrorMessage } from "@/utils/index.ts";
import { StorageService } from "@/shared/services/storageService.ts";
import { BugOutlined, SyncOutlined } from "@ant-design/icons";

const { Text } = Typography;

const HeaderBar = () => {
  const { message } = App.useApp();
  const { enabled } = useStorageState();

  function handleEnabledChange(enabled: boolean): void {
    StorageService.setStoredState({ enabled })
      .then(() => message.success(`已切换到${enabled ? "启用" : "禁用"}状态`))
      .catch((err) => message.error(`切换失败：${getErrorMessage(err)}`));
  }

  return (
    <header
      className="bg-white rounded-xl shadow-sm p-5"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e0e0e0",
      }}
    >
      <div className="flex items-center justify-between gap-6">
        {/* 左侧标题区域 */}
        <Space size="middle" align="start">
          <Badge dot status={enabled ? "processing" : "default"} color="#4285f4">
            <BugOutlined style={{ fontSize: 20, color: "#5f6368" }} />
          </Badge>
          <div>
            <Space size="small" align="center">
              <Text strong style={{ fontSize: 15, color: "#202124" }}>
                API 拦截与代理管理
              </Text>
              <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                v1.0
              </Tag>
            </Space>
            <Text type="secondary" className="text-xs font-mono mt-0.5 block">
              {">"} 管理接口拦截规则，重定向到本地服务
            </Text>
          </div>
        </Space>

        {/* 右侧开关区域 */}
        <Space size="middle" align="center">
          <Divider type="vertical" style={{ height: 24, margin: 0 }} />
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 13 }}>
              全局拦截
            </Text>
            <Switch
              checked={enabled}
              onChange={handleEnabledChange}
              checkedChildren={<SyncOutlined spin={enabled} />}
              unCheckedChildren="∅"
            />
            <Badge
              status={enabled ? "success" : "default"}
              text={
                <Text
                  style={{
                    fontSize: 12,
                    color: enabled ? "#1a73e8" : "#9aa0a6",
                    fontWeight: enabled ? 500 : 400,
                  }}
                >
                  {enabled ? "运行中" : "已暂停"}
                </Text>
              }
            />
          </Space>
        </Space>
      </div>
    </header>
  );
};

export default HeaderBar;
