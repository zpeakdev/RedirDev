import React from "react";
import { List, Button, Popconfirm, Typography, Switch } from "antd";
import { DeleteOutlined, EditOutlined, SearchOutlined, LinkOutlined } from "@ant-design/icons";
import type { RuleConfig } from "../../types";

interface RuleItemProps {
  rule: RuleConfig;
  onEdit: (rule: RuleConfig) => void;
  onDelete: (rule: RuleConfig) => void;
  onToggle: (rule: RuleConfig, enabled: boolean) => void;
}

const { Text } = Typography;

const RuleItem: React.FC<RuleItemProps> = ({ rule, onEdit, onDelete, onToggle }) => {
  const isEnabled = !!rule.enabled;

  return (
    <List.Item
      className={!isEnabled ? "opacity-60 bg-gray-50" : ""}
      actions={[
        <Switch
          key="toggle"
          size="small"
          checked={isEnabled}
          onChange={(checked) => onToggle(rule, checked)}
        />,
        <Button
          key="edit"
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onEdit(rule)}
        />,
        <Popconfirm
          key="delete"
          title="确定删除此规则？"
          description={`${rule.matchUrl}`}
          onConfirm={() => onDelete(rule)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true, size: "small" }}
        >
          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>,
      ]}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <Text type="secondary" className="text-[11px]">
          <SearchOutlined /> 匹配
        </Text>
        <Text className={`text-xs break-all leading-relaxed ${!isEnabled ? "line-through" : ""}`}>
          {rule.matchUrl}
        </Text>
        <Text type="secondary" className="text-[11px]">
          <LinkOutlined /> {rule.type === "proxy" ? "代理地址" : "重定向地址"}
        </Text>
        <Text className={`text-xs break-all leading-relaxed ${!isEnabled ? "line-through" : ""}`}>
          {rule.targetUrl}
        </Text>
      </div>
    </List.Item>
  );
};

export default RuleItem;
