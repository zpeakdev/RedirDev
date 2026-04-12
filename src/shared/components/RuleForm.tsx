import React from "react";
import { Form, FormInstance, Input, Switch } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";

interface RuleFormProps {
  form: FormInstance;
}

const RuleForm: React.FC<RuleFormProps> = ({ form }) => {
  return (
    <Form form={form} layout="vertical" className="mt-4" initialValues={{ enabled: true }}>
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
      <Form.Item
        name="enabled"
        label="启用/禁用规则"
      >
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>
    </Form>
  );
};

export default RuleForm;
