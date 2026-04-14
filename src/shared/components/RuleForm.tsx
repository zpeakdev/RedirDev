import React from "react";
import { Form, FormInstance, Input, Switch, Radio } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";

interface RuleFormProps {
  form: FormInstance;
}

const RuleForm: React.FC<RuleFormProps> = ({ form }) => {
  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-4"
      initialValues={{ enabled: true, type: "redirect" }}
    >
      <Form.Item
        name="type"
        label="规则类型"
        rules={[{ required: true, message: "请选择规则类型" }]}
      >
        <Radio.Group>
          <Radio.Button value="redirect">重定向</Radio.Button>
          <Radio.Button value="proxy">代理</Radio.Button>
        </Radio.Group>
      </Form.Item>
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
        name="targetUrl"
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
