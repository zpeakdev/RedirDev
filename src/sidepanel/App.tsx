import { useMemo, useState } from "react";
import { Switch, Button, List, Typography, Tag, Space, Divider, App, Form } from "antd";
import { PlusOutlined, SettingOutlined } from "@ant-design/icons";
import { getErrorMessage } from "@/utils/index.ts";
import { StorageService } from "@/shared/services/storageService";
import { RuleService } from "@/shared/services/ruleService";
import RuleItem from "@/shared/components/RuleItem";
import { useStorageState } from "@/shared/hooks/useStorageState";
import type { RuleConfig } from "@/types/index.ts";
import AddRuleModal from "@/shared/components/AddRuleModal.tsx";

const { Text, Title } = Typography;

function SidePanel() {
  const { message } = App.useApp();
  const { enabled, rules } = useStorageState();
  const [modalForm] = Form.useForm();
  const [ruleId, setRuleId] = useState<string | undefined>(); // 当前选中的规则ID
  const isEdit = useMemo(() => !!ruleId, [ruleId])
  const currentRule = useMemo(() => rules.find(r => r.id === ruleId), [rules, ruleId])
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * 跳转到 options 页面
   */
  function handleOpenOptions(): void {
    if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      message.error("无法打开设置页面");
    }
  }

  /**
   * 打开模态框
   * @param rule 规则
   */
  function handleOpenModal(rule?: RuleConfig): void {
    setRuleId(rule?.id);
    if (rule?.id) {
      modalForm.setFieldsValue(rule);
    }
    setIsModalOpen(true);
  }

  /**
   * 关闭模态框
   */
  function handleCloseModal(): void {
    setRuleId(undefined);
    modalForm.resetFields();
    setIsModalOpen(false);
  }

  /**
   * 提交规则
   */
  async function handleModalSubmit(): Promise<void> {
    try {
      await modalForm.validateFields();
      const formValues = modalForm.getFieldsValue(true);

      if (isEdit) {
        await RuleService.updateRule({ ...currentRule, ...formValues });
        message.success("规则已更新");
      } else {
        await RuleService.addRule(formValues);
        message.success("规则已添加");
      }
      handleCloseModal();
    } catch (error) {
      message.error(
        `${isEdit ? "更新" : "添加"}失败：${getErrorMessage(error)}`
      );
    }
  }

  /**
   * 删除规则
   * @param rule 规则
   */
  async function handleDeleteRule(rule: RuleConfig): Promise<void> {
    try {
      await RuleService.deleteRule(rule.id);
      message.success("规则已删除。");
      // 如果删除的是当前选中的规则，清除选中态
      if (ruleId === rule.id) {
        setRuleId(undefined);
      }
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
      await StorageService.setStoredState({ enabled: checked });
      message.success(`已切换到${checked ? "启用" : "禁用"}状态。`);
    } catch (error) {
      message.error(`切换失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 切换单条规则启用状态
   * @param rule 规则
   * @param enabled 是否启用
   */
  async function handleToggleRule(rule: RuleConfig, enabled: boolean): Promise<void> {
    try {
      await RuleService.toggleRuleEnabled(rule.id, enabled);
      message.success(`规则已${enabled ? "启用" : "禁用"}`);
    } catch (error) {
      message.error(`操作失败：${getErrorMessage(error)}`);
    }
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-white">

      <div className="flex justify-between py-2">
        <Title level={4} className="m-0">
          网络拦截与重定向
        </Title>
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
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={handleOpenOptions}
            title="打开设置"
          />
        </Space>
      </div>

      <Divider className="my-3" />

      <div className="flex flex-col">
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

      <Divider className="my-4" />

      <div className="mb-2">
        <Space size={2}>
          <Text strong>已保存规则</Text>
          <Tag>{rules.length} 条</Tag>
        </Space>
      </div>

      <List
        size="small"
        className="min-h-45 max-h-[calc(100vh-280px)] overflow-y-auto"
        locale={{ emptyText: "暂无规则" }}
        dataSource={rules}
        renderItem={(rule) => (
          <RuleItem
            rule={rule}
            onEdit={handleOpenModal}
            onDelete={handleDeleteRule}
            onToggle={handleToggleRule}
          />
        )}
      />

      <AddRuleModal
        isEdit={isEdit}
        modalForm={modalForm}
        open={isModalOpen}
        onSubmit={handleModalSubmit}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default SidePanel;
