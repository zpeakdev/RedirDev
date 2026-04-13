import { useMemo, useState } from "react";
import { App, Form } from "antd";
import HeaderBar from "./components/HeaderBar";
import RuleSidebar from "./components/RuleSidebar";
import RuleDetailPanel from "./components/RuleDetailPanel";
import AddRuleModal from "@/shared/components/AddRuleModal";
import { useStorageState } from "@/shared/hooks/useStorageState.ts";
import { RuleService } from "@/shared/services/ruleService.ts";
import { getErrorMessage } from "@/utils/index.ts";
import type { RuleConfig } from "@/types/index.ts";

const Options = () => {
  const { message } = App.useApp();
  const { rules } = useStorageState();

  // 页面级状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ruleId, setRuleId] = useState<string | undefined>(undefined); // 当前选中的规则ID
  const isEdit = useMemo(() => !!ruleId, [ruleId])
  const currentRule = useMemo(() => rules.find(r => r.id === ruleId), [rules, ruleId])
  const [modalFormInstance] = Form.useForm();



  const [selectedRuleId, setSelectedRuleId] = useState<string | undefined>(undefined);
  const selectedRule = useMemo(() => rules.find(r => r.id === selectedRuleId), [rules, selectedRuleId]);
  /**
   * 选中规则（点击左侧列表项）
   */
  function handleSelectRule(rule: RuleConfig | undefined): void {
    setSelectedRuleId(rule?.id)
  }

  /**
   * 打开添加/编辑规则弹窗
   */
  function handleOpenModal(rule?: RuleConfig): void {
    setRuleId(rule?.id);
    if (rule?.id) {
      modalFormInstance.setFieldsValue(rule);
    }
    setIsModalOpen(true);
  }

  /**
   * 关闭弹窗并重置状态
   */
  function handleCloseModal(): void {
    setRuleId(undefined);
    modalFormInstance.resetFields();
    setIsModalOpen(false);
  }

  /**
   * 提交弹窗表单 - 新增或编辑规则
   */
  async function handleModalSubmit(): Promise<void> {
    try {
      await modalFormInstance.validateFields();
      const formValues = modalFormInstance.getFieldsValue(true);

      if (isEdit) {
        await RuleService.updateRule({ ...currentRule, ...formValues });
        message.success("规则已更新");
      } else {
        const newRule = await RuleService.addRule(formValues);
        message.success("规则已添加");
        // 自动选中新创建的规则
        ruleId && setRuleId(newRule.id)
      }
      handleCloseModal();
    } catch (error) {
      message.error(`${isEdit ? "更新" : "添加"}失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 删除规则
   */
  async function handleDeleteRule(rule: RuleConfig): Promise<void> {
    try {
      await RuleService.deleteRule(rule.id);
      message.success("规则已删除");

      // 如果删除的是当前选中的规则，清除选中态
      if (selectedRuleId === rule.id) {
        setSelectedRuleId(undefined);
      }
    } catch (error) {
      message.error(`删除失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 切换单条规则的启用/禁用状态
   */
  async function handleToggleRule(rule: RuleConfig, enabled: boolean): Promise<void> {
    try {
      await RuleService.toggleRuleEnabled(rule.id, enabled);
      message.success(`规则已${enabled ? "启用" : "禁用"}`);
    } catch (error) {
      message.error(`操作失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 导入规则（JSON 文件批量导入）
   */
  async function handleImportRules(): Promise<void> {
    const count = await RuleService.importRulesFromFile();
    if (!count) {
      message.error("导入失败：文件格式不正确，需要 JSON 数组");
    } else {
      message.success(`成功导入 ${count} 条规则`);
    }
  }

  /**
   * 导出规则为 JSON 文件下载
   */
  function handleExportRules(): void {
    if (rules.length === 0) {
      message.warning("没有规则可以导出");
      return;
    }
    RuleService.exportRulesToFile(rules);
    message.success("规则导出成功");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-5">
      {/* 顶部 Header */}
      <HeaderBar />

      {/* 双栏主内容区 */}
      <main className="grid grid-cols-[320px_1fr] gap-5 mt-5 min-h-0">
        {/* 左侧边栏 - 规则列表 */}
        <RuleSidebar
          rules={rules}
          selectedRuleId={selectedRuleId}
          onSelectRule={handleSelectRule}
          onAddRule={() => handleOpenModal()}
          onEditRule={handleOpenModal}
          onDeleteRule={handleDeleteRule}
          onToggleRule={handleToggleRule}
          onImportRules={handleImportRules}
          onExportRules={handleExportRules}
        />

        {/* 右侧面板 - 规则详情 */}
        <RuleDetailPanel
          rule={selectedRule}
        />
      </main>

      {/* 添加/编辑规则弹窗 */}
      <AddRuleModal
        open={isModalOpen}
        isEdit={isEdit}
        modalForm={modalFormInstance}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default Options;
