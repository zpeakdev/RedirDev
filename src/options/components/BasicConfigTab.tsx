import { Form, Input, Select, Switch } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";
import type { FC } from "react";
import type { FormInstance } from "antd";
import type { RuleConfig } from "@/types/index.ts";

interface BasicConfigTabProps {
  form: FormInstance;
  initialValues?: Partial<RuleConfig>;
  readOnly?: boolean;
}

const BasicConfigTab: FC<BasicConfigTabProps> = ({ form, initialValues, readOnly }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-2"
      initialValues={{
        enabled: true,
        ...initialValues,
      }}
      disabled={readOnly}
    >
      <Form.Item name="matchUrl" label="匹配模式"
        rules={[{ required: true, message: "请输入匹配规则" }]}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="如 *://example.com/* 或 /api/users/*"
          allowClear
        />
      </Form.Item>

      <Form.Item name="redirectUrl" label="目标地址"
        rules={[{ required: true, message: "请输入目标地址" }]}
      >
        <Input
          prefix={<LinkOutlined />}
          placeholder="如 https://localhost:3000/api/users"
          allowClear
        />
      </Form.Item>

      <Form.Item name="enabled" valuePropName="checked">
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        <span className="ml-2 text-sm text-gray-600">启用此规则</span>
      </Form.Item>
    </Form>
  );
};

export default BasicConfigTab;
