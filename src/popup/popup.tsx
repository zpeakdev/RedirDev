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
  App,
  Modal,
  Form
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  LinkOutlined,
  EditOutlined
} from "@ant-design/icons";
import "./popup.css";

const { Text, Title } = Typography;

function Popup() {
  const { message } = App.useApp();
  const [enabled, setEnabled] = useState(false);
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalForm] = Form.useForm();

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

  const [isEdit, setIsEdit] = useState(false);
  /**
   * 打开模态框
   * @param rule 规则
   */
  function handleOpenModal(rule?: RuleConfig): void {
    setIsEdit(!!rule);
    if (isEdit) {
      modalForm.setFieldsValue(rule);
    } else {
      modalForm.resetFields();
    }
    setIsModalOpen(true);
  }

  /**
   * 关闭模态框
   */
  function handleCloseModal(): void {
    setIsModalOpen(false);
    modalForm.resetFields();
  }

  /**
   * 提交规则
   */
  async function handleModalSubmit(): Promise<void> {
    try {
      await modalForm.validateFields(); // 校验
      const currentRule: RuleConfig = modalForm.getFieldsValue(true);
      const { rules: localRules } = await getStoredState();

      if (isEdit) {
        const index = localRules.findIndex(
          (rule) => rule.id === currentRule.id
        );
        localRules[index] = currentRule;
        message.success("规则已更新");
      } else {
        localRules.push({
          id: new Date().getTime().toString(26),
          matchUrl: currentRule.matchUrl,
          redirectUrl: currentRule.redirectUrl
        });
        message.success("规则已添加");
      }
      await chrome.storage.local.set({ rules: localRules });
      handleCloseModal();
    } catch (error) {
      message.error(
        `${isEdit ? "更新" : "添加"}失败：${getErrorMessage(error)}`
      );
    }
  }

  /**
   * 删除规则
   * @param id 规则ID
   */
  async function handleDeleteRule({ id }: RuleConfig): Promise<void> {
    try {
      const newRules = rules?.filter((rule) => rule.id !== id);
      await chrome.storage.local.set({ rules: newRules || [] });
      message.success("规则已删除。");
    } catch (error) {
      message.error(`删除失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 切换启用状态
   * @param checked 是否启用
   */
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

      <div className="popup-actions">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          onClick={() => handleOpenModal()}
          size="small"
        >
          新增规则
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
              <Button
                key="edit"
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleOpenModal(rule)}
              />,
              <Popconfirm
                key="delete"
                title="确定删除此规则？"
                description={`${rule.matchUrl}`}
                onConfirm={() => handleDeleteRule(rule)}
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
              </Popconfirm>
            ]}
          >
            <div className="popup-rule-content">
              <Text type="secondary" className="popup-rule-label">
                <SearchOutlined /> 匹配
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

      <Modal
        title={!isEdit ? "新增规则" : "编辑规则"}
        open={isModalOpen}
        onOk={handleModalSubmit}
        onCancel={handleCloseModal}
        okText={!isEdit ? "添加" : "保存"}
        cancelText="取消"
      >
        <Form form={modalForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="matchUrl"
            label="匹配规则(URL)"
            rules={[{ required: true, message: "请输入匹配规则" }]}
          >
            <Input
              prefix={<SearchOutlined />}
              placeholder="如 *://example.com/*"
              allowClear
            />
          </Form.Item>
          <Form.Item
            name="redirectUrl"
            label="目标地址"
            rules={[{ required: true, message: "请输入目标地址" }]}
          >
            <Input
              prefix={<LinkOutlined />}
              placeholder="如 https://example.com/new"
              allowClear
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Popup;
