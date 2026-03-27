import { useCallback, useEffect, useState } from "react";
import type { RuleConfig } from "../utils/storage.ts";
import { getStoredState } from "../utils/storage.ts";
import { getErrorMessage } from "../utils/index.ts";
import {
  Switch,
  Input,
  Button,
  List,
  Typography,
  Tag,
  Space,
  Popconfirm,
  Divider,
  App as AntApp,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  LinkOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import "./popup.css";

const { Text, Title } = Typography;

type ValidInput = {
  ok: true;
  matchUrl: string;
  redirectUrl: string;
};

type InvalidInput = {
  ok: false;
  message: string;
};

type ValidateResult = ValidInput | InvalidInput;

function validateInput(
  matchUrl: string,
  redirectUrl: string
): ValidateResult {
  const m = (matchUrl || "").trim();
  const r = (redirectUrl || "").trim();
  if (!m) return { ok: false, message: '请输入\u201c匹配规则(URL)\u201d' };
  if (!r) return { ok: false, message: '请输入\u201c目标地址(Redirect URL)\u201d' };
  return { ok: true, matchUrl: m, redirectUrl: r };
}

function Popup() {
  const { message } = AntApp.useApp();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [matchUrl, setMatchUrl] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  const loadStorageState = useCallback(async () => {
    try {
      const state = await getStoredState();
      setEnabled(state.enabled);
      setRules(state.rules);
    } catch (error) {
      message.error(`加载失败：${getErrorMessage(error)}`);
    }
  }, [message]);

  useEffect(() => {
    loadStorageState();

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "local") return;
      if (changes.enabled || changes.rules) {
        loadStorageState();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loadStorageState]);

  async function handleAddRule(): Promise<void> {
    try {
      const result = validateInput(matchUrl, redirectUrl);
      if (!result.ok) {
        message.warning(result.message);
        return;
      }

      const { rules } = await getStoredState();
      rules.push({
        matchUrl: result.matchUrl,
        redirectUrl: result.redirectUrl,
      });
      await chrome.storage.local.set({ rules });

      message.success("规则已保存，后台将立即同步。");
      setMatchUrl("");
      setRedirectUrl("");
    } catch (error) {
      message.error(`保存失败：${getErrorMessage(error)}`);
    }
  }

  async function handleDeleteRule(index: number): Promise<void> {
    try {
      const newRules = rules?.filter((_, i) => i !== index);
      await chrome.storage.local.set({ rules: newRules || [] });
      message.success("规则已删除。");
    } catch (error) {
      message.error(`删除失败：${getErrorMessage(error)}`);
    }
  }

  async function handleEnabledChange(checked: boolean): Promise<void> {
    try {
      await chrome.storage.local.set({ enabled: checked });
      message.success(`已切换到${checked ? "启用" : "禁用"}状态。`);
    } catch (error) {
      message.error(`切换失败：${getErrorMessage(error)}`);
    }
  }

  return (
    <div className="popup-container">
      <Title level={4} className="popup-title">
        网络拦截与重定向
      </Title>

      <Divider style={{ margin: "8px 0 12px" }} />

      <div className="popup-toggle">
        <Space size={8}>
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

      <Divider style={{ margin: "8px 0" }} />

      <div className="popup-form">
        <Input
          prefix={<SearchOutlined />}
          placeholder="匹配规则(URL)，如 *://example.com/*"
          value={matchUrl}
          onChange={(e) => setMatchUrl(e.target.value)}
          allowClear
          size="small"
        />
        <Input
          prefix={<LinkOutlined />}
          placeholder="目标地址，如 https://example.com/new"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          allowClear
          style={{ marginTop: 8 }}
          size="small"
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={handleAddRule}
          style={{ marginTop: 8 }}
          size="small"
        >
          保存并添加规则
        </Button>
      </div>

      <Divider style={{ margin: "12px 0 8px" }} />

      <div className="popup-list-header">
        <Space size={8}>
          <Text strong>已保存规则</Text>
          <Tag>{rules.length} 条</Tag>
        </Space>
      </div>

      <List
        size="small"
        className="popup-rule-list"
        locale={{ emptyText: "暂无规则" }}
        dataSource={rules}
        renderItem={(rule, index) => (
          <List.Item
            actions={[
              <Popconfirm
                key="delete"
                title="确定删除此规则？"
                description={`${rule.matchUrl}`}
                onConfirm={() => handleDeleteRule(index)}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true, size: "small" }}
              >
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>,
            ]}
          >
            <div className="popup-rule-content">
              <Text type="secondary" className="popup-rule-label">
                <SwapOutlined /> 匹配
              </Text>
              <Text className="popup-rule-value">{rule.matchUrl}</Text>
              <Text type="secondary" className="popup-rule-label">
                <LinkOutlined /> 跳转
              </Text>
              <Text className="popup-rule-value">{rule.redirectUrl}</Text>
            </div>
          </List.Item>
        )}
      />
    </div>
  );
}

export default function App() {
  return (
    <AntApp>
      <Popup />
    </AntApp>
  );
}
