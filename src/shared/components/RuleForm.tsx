import React from "react";
import { Form, FormInstance, Input } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";
import type { RuleConfig } from "../../types";

interface RuleFormProps {
  form: FormInstance;
  initialValues?: Partial<RuleConfig>;
}

const RuleForm: React.FC<RuleFormProps> = ({ form, initialValues }) => {
  return (
    <Form form={form} layout="vertical" className="mt-4" initialValues={initialValues}>
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
  );
};

export default RuleForm;
