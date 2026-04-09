import { useState } from "react";
import { App, Form } from "antd";
import HeaderBar from "./components/HeaderBar";
import RuleSidebar from "./components/RuleSidebar";
import RuleDetailPanel from "./components/RuleDetailPanel";
import AddRuleModal from "./components/AddRuleModal";
import { useStorageState } from "@/shared/hooks/useStorageState.ts";
import { RuleService } from "@/shared/services/ruleService.ts";
import { StorageService } from "@/shared/services/storageService.ts";
import { getErrorMessage } from "@/utils/index.ts";
import type { RuleConfig } from "@/types/index.ts";

const Options = () => {
  const { message } = App.useApp();
  const { enabled, rules } = useStorageState();

  // 页面级状态
  const [selectedRuleId, setSelectedRuleId] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentRule, setCurrentRule] = useState<RuleConfig | undefined>();
  const [modalFormInstance] = Form.useForm();

  /** 获取当前选中的规则对象 */
  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  /**
   * 切换全局拦截开关
   */
  function handleEnabledChange(checked: boolean): void {
    StorageService.setStoredState({ enabled: checked })
      .then(() => message.success(`已切换到${checked ? "启用" : "禁用"}状态`))
      .catch((err) => message.error(`切换失败：${getErrorMessage(err)}`));
  }

  /**
   * 选中规则（点击左侧列表项）
   */
  function handleSelectRule(rule: RuleConfig | undefined): void {
    setSelectedRuleId(rule?.id);
  }

  /**
   * 打开添加/编辑规则弹窗
   */
  function handleOpenModal(rule?: RuleConfig): void {
    setIsEdit(!!rule);
    setCurrentRule(rule);
    if (rule && modalFormInstance) {
      modalFormInstance.setFieldsValue(rule);
    } else if (modalFormInstance) {
      modalFormInstance.resetFields();
    }
    setIsModalOpen(true);
  }

  /**
   * 关闭弹窗并重置状态
   */
  function handleCloseModal(): void {
    setIsModalOpen(false);
    setCurrentRule(undefined);
    if (modalFormInstance) modalFormInstance.resetFields();
  }

  /**
   * 提交弹窗表单 - 新增或编辑规则
   */
  async function handleModalSubmit(): Promise<void> {
    if (!modalFormInstance) return;

    try {
      await modalFormInstance.validateFields();
      const formValues = modalFormInstance.getFieldsValue(true);

      if (isEdit && currentRule) {
        await RuleService.updateRule({ ...currentRule, ...formValues });
        message.success("规则已更新");

        // 更新选中状态，确保右侧面板显示最新数据
        if (selectedRuleId === currentRule.id) {
          setSelectedRuleId(currentRule.id); // 触发刷新
        }
      } else {
        const newRule = await RuleService.addRule(formValues);
        message.success("规则已添加");
        // 自动选中新创建的规则
        setSelectedRuleId(newRule.id);
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
   * 从右侧详情面板保存规则修改
   */
  async function handleUpdateRule(updatedRule: RuleConfig): Promise<void> {
    try {
      await RuleService.updateRule(updatedRule);
      message.success("规则已保存");
    } catch (error) {
      message.error(`保存失败：${getErrorMessage(error)}`);
    }
  }

  /**
   * 导入规则（JSON 文件批量导入）
   */
  function handleImportRules(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || !target.files[0]) return;

      try {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const importedRules = JSON.parse(content);
            if (Array.isArray(importedRules)) {
              for (const r of importedRules) {
                await RuleService.addRule(r);
              }
              message.success(`成功导入 ${importedRules.length} 条规则`);
            } else {
              message.error("导入失败：文件格式不正确，需要 JSON 数组");
            }
          } catch (err) {
            message.error(`导入失败：${getErrorMessage(err)}`);
          }
        };
        reader.readAsText(file);
      } catch (err) {
        message.error(`导入失败：${getErrorMessage(err)}`);
      }
    };
    input.click();
  }

  /**
   * 导出规则为 JSON 文件下载
   */
  function handleExportRules(): void {
    if (rules.length === 0) {
      message.warning("没有规则可以导出");
      return;
    }

    const dataStr = JSON.stringify(rules, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `redirect-rules-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    message.success("规则导出成功");
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] p-5">
      {/* 顶部 Header */}
      <HeaderBar enabled={enabled} onEnabledChange={handleEnabledChange} />

      {/* 双栏主内容区 */}
      <main className="grid grid-cols-[320px_1fr] gap-5 mt-5 min-h-0">
        {/* 左侧边栏 - 规则列表 */}
        <RuleSidebar
          rules={rules}
          selectedRuleId={selectedRuleId}
          onSelectRule={handleSelectRule}
          onAddRule={() => handleOpenModal()}
          onEditRule={(rule) => handleOpenModal(rule)}
          onDeleteRule={handleDeleteRule}
          onToggleRule={handleToggleRule}
          onImportRules={handleImportRules}
          onExportRules={handleExportRules}
        />

        {/* 右侧面板 - 规则详情 */}
        <RuleDetailPanel
          rule={selectedRule}
          onUpdate={handleUpdateRule}
        />
      </main>

      {/* 添加/编辑规则弹窗 */}
      <AddRuleModal
        open={isModalOpen}
        isEdit={isEdit}
        currentRule={currentRule}
        modalForm={modalFormInstance}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default Options;
