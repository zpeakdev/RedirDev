import { Switch, Button, Popconfirm, Typography, Tag } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import type { FC } from "react";
import type { RuleConfig } from "@/types/index.ts";

const { Text } = Typography;

interface OptionRuleItemProps {
  rule: RuleConfig;
  isActive: boolean;
  onSelect: (rule: RuleConfig) => void;
  onEdit: (rule: RuleConfig) => void;
  onDelete: (rule: RuleConfig) => void;
  onToggle: (rule: RuleConfig, enabled: boolean) => void;
}

const OptionRuleItem: FC<OptionRuleItemProps> = ({
  rule,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onToggle,
}) => {
  const isEnabled = !!rule.enabled;

  return (
    <div
      onClick={() => onSelect(rule)}
      className={`
        p-3 rounded-lg border cursor-pointer transition-all duration-200 mb-2
        ${isActive
          ? "border-[#667eea] bg-[#edf2ff] shadow-[0_0_0_2px_rgba(102,126,234,0.2)]"
          : "border-gray-200 hover:border-[#667eea] hover:bg-[#f8f9ff]"
        }
        ${!isEnabled ? "opacity-60" : ""}
      `}
    >
      {/* 规则头部 */}
      <div className="flex items-center justify-between mb-1">
        <Text strong className="text-sm truncate max-w-[160px]">
          {rule.matchUrl.slice(0, 20) || "未命名规则"}
        </Text>
        <Tag color="processing" className="m-0 text-xs!">
          重定向
        </Tag>
      </div>

      {/* 匹配 URL */}
      <div className="flex items-center gap-1 mb-0.5">
        <SearchOutlined className="text-[10px] text-gray-400 shrink-0" />
        <Text className="text-xs text-gray-500 truncate break-all">
          匹配: {rule.matchUrl}
        </Text>
      </div>

      {/* 目标 URL */}
      <div className="flex items-center gap-1 mb-2">
        <LinkOutlined className="text-[10px] text-gray-400 shrink-0" />
        <Text
          className={`text-xs truncate break-all ${!isEnabled ? "line-through" : ""}`}
        >
          目标: {rule.redirectUrl}
        </Text>
      </div>

      {/* 操作行 */}
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: isEnabled ? "#52c41a" : "#d9d9d9" }}
        />
        <Text className="text-xs text-gray-500 shrink-0">
          {isEnabled ? "已启用" : "已禁用"}
        </Text>

        <div className="ml-auto flex items-center gap-1">
          <Switch
            size="small"
            checked={isEnabled}
            onChange={(checked) => onToggle(rule, checked)}
            onClick={(_, e) => e.stopPropagation()}
          />
          <Button
            size="small"
            className="px-2! py-0! h-6! text-xs!"
            style={{ background: "#ffc107", color: "#333", border: "none" }}
            onClick={(e) => { e.stopPropagation(); onEdit(rule); }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此规则？"
            description={rule.matchUrl}
            onConfirm={() => onDelete(rule)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true, size: "small" }}
          >
            <Button
              size="small"
              danger
              className="px-2! py-0! h-6! text-xs!"
              onClick={(e) => e.stopPropagation()}
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </div>
      </div>
    </div>
  );
};

export default OptionRuleItem;
