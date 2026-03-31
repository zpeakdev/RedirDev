import React from "react";
import { List, Button, Popconfirm, Typography, Space } from "antd";
import { DeleteOutlined, EditOutlined, SearchOutlined, LinkOutlined } from "@ant-design/icons";
import type { RuleConfig } from "../../types";

interface RuleItemProps {
  rule: RuleConfig;
  onEdit: (rule: RuleConfig) => void;
  onDelete: (rule: RuleConfig) => void;
}

const { Text } = Typography;

const RuleItem: React.FC<RuleItemProps> = ({ rule, onEdit, onDelete }) => {
  return (
    <List.Item
      actions={[
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
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      ]}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <Text type="secondary" className="text-[11px]">
          <SearchOutlined /> 匹配
        </Text>
        <Text className="text-xs break-all leading-relaxed">
          {rule.matchUrl}
        </Text>
        <Text type="secondary" className="text-[11px]">
          <LinkOutlined /> 跳转
        </Text>
        <Text className="text-xs break-all leading-relaxed">
          {rule.redirectUrl}
        </Text>
      </div>
    </List.Item>
  );
};

export default RuleItem;
