import { Switch, Button, Typography, Tag, Space, Divider, message } from "antd";
import { getErrorMessage } from "@/utils/index.ts";
import { StorageService } from "@/shared/services/storageService";
import { RuleService } from "@/shared/services/ruleService";
import { useStorageState } from "@/shared/hooks/useStorageState";

const { Text, Title } = Typography;

function Popup() {
  const { enabled, rules } = useStorageState();

  /**
   * 切换启用状态
   * @param checked 是否启用
   */
  async function handleEnabledChange(checked: boolean): Promise<void> {
    try {
      await StorageService.setStoredState({ enabled: checked });
      message.success(`已切换到${checked ? "启用" : "禁用"}状态。`);
    } catch (error) {
      message.error(`切换失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 打开侧边栏
   */
  function openSidePanel(): void {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.sidePanel.open({
          tabId: tabs[0].id,
        });
      }
    });
  }

  /**
   * 导入规则
   */
  function handleImportRules(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        try {
          const file = target.files[0];
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const content = event.target?.result as string;
              const importedRules = JSON.parse(content);
              if (Array.isArray(importedRules)) {
                for (const rule of importedRules) {
                  await RuleService.addRule(rule);
                }
                message.success(`成功导入 ${importedRules.length} 条规则`);
              } else {
                message.error("导入失败：文件格式不正确");
              }
            } catch (error) {
              message.error(`导入失败：${getErrorMessage(error)}`);
            }
          };
          reader.readAsText(file);
        } catch (error) {
          message.error(`导入失败：${getErrorMessage(error)}`);
        }
      }
    };
    input.click();
  }

  /**
   * 导出规则
   */
  function handleExportRules(): void {
    if (rules.length === 0) {
      message.warning("没有规则可以导出");
      return;
    }

    const dataStr = JSON.stringify(rules, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `redirect-rules-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success("规则导出成功");
  }

  /**
   * 清空所有规则
   */
  function handleClearRules(): void {
    if (rules.length === 0) {
      message.warning("没有规则可以清空");
      return;
    }

    if (window.confirm("确定要清空所有规则吗？此操作不可恢复。")) {
      rules.forEach(async (rule) => {
        await RuleService.deleteRule(rule.id);
      });
      message.success("所有规则已清空");
    }
  }

  return (
    <div className="w-80 p-3">
      {/* 标题 */}
      <Title level={4} className="m-0">
        网络拦截与重定向
      </Title>

      <Divider className="my-2" />

      {/* 核心状态 */}
      <div className="py-1">
        <Space size={2}>
          <Text>启用</Text>
          <Switch
            checked={enabled}
            checkedChildren="开"
            unCheckedChildren="关"
            onChange={handleEnabledChange}
          />
          <Tag color={enabled ? "success" : "default"} variant="outlined">
            {enabled ? "运行中" : "已暂停"}
          </Tag>
        </Space>
      </div>

      {/* 规则概览 */}
      <div className="py-1">
        <Space size={2}>
          <Text>规则数量</Text>
          <Tag>{rules.length} 条</Tag>
        </Space>
      </div>

      <Divider className="my-2" />

      {/* 快速操作 */}
      <div className="flex flex-col gap-2">
        <Button type="primary" block onClick={openSidePanel} size="small">
          打开规则管理 (侧边栏)
        </Button>

        <Button block onClick={handleImportRules} size="small">
          导入规则
        </Button>

        <Button block onClick={handleExportRules} size="small">
          导出规则
        </Button>

        <Button block danger onClick={handleClearRules} size="small">
          清空规则
        </Button>
      </div>

      <Divider className="my-2" />

      {/* 系统信息 */}
      <div className="text-xs text-gray-500">
        <Text>版本: 0.0.0</Text>
        <br />
        <Text>状态: {enabled ? "正常运行" : "已暂停"}</Text>
      </div>
    </div>
  );
}

export default Popup;
