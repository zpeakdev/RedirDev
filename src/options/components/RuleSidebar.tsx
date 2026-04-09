import { Button, Empty, Typography, Space, Tag } from "antd";
import { PlusOutlined, ImportOutlined, ExportOutlined } from "@ant-design/icons";
import type { FC } from "react";
import type { RuleConfig } from "@/types/index.ts";
import OptionRuleItem from "./OptionRuleItem";

const { Title } = Typography;

interface RuleSidebarProps {
  rules: RuleConfig[];
  selectedRuleId: string | undefined;
  onSelectRule: (rule: RuleConfig | undefined) => void;
  onAddRule: () => void;
  onEditRule: (rule: RuleConfig) => void;
  onDeleteRule: (rule: RuleConfig) => void;
  onToggleRule: (rule: RuleConfig, enabled: boolean) => void;
  onImportRules: () => void;
  onExportRules: () => void;
}

const RuleSidebar: FC<RuleSidebarProps> = ({
  rules,
  selectedRuleId,
  onSelectRule,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
  onImportRules,
  onExportRules,
}) => {
  return (
    <aside className="bg-white rounded-xl shadow-sm p-5 flex flex-col min-h-0 w-[320px] shrink-0">
      <div className="flex items-center justify-between mb-4">
        <Title level={5} className="m-0! text-base!">
          拦截规则
        </Title>
        <Tag>{rules.length} 条</Tag>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAddRule}
          size="small"
          className="flex-1"
        >
          添加规则
        </Button>
        <Button
          icon={<ImportOutlined />}
          onClick={onImportRules}
          size="small"
        >
          导入
        </Button>
        <Button
          icon={<ExportOutlined />}
          onClick={onExportRules}
          size="small"
        >
          导出
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {rules.length === 0 ? (
          <Empty
            description="暂无规则"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            className="mt-8"
          />
        ) : (
          rules.map((rule) => (
            <OptionRuleItem
              key={rule.id}
              rule={rule}
              isActive={rule.id === selectedRuleId}
              onSelect={onSelectRule}
              onEdit={onEditRule}
              onDelete={onDeleteRule}
              onToggle={onToggleRule}
            />
          ))
        )}
      </div>
    </aside>
  );
};

export default RuleSidebar;
