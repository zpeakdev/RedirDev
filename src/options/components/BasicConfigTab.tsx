import { Form, Input, Switch, Radio } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";
import { memo } from "react";
import type { FormInstance } from "antd";

interface BasicConfigTabProps {
  form: FormInstance;
}

function BasicConfigTab({ form }: BasicConfigTabProps) {
  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-2"
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

      <Form.Item name="matchUrl" label="匹配模式"
        rules={[{ required: true, message: "请输入匹配规则" }]}
      >
        <Input
          prefix={<SearchOutlined />}
          placeholder="如 *://example.com/* 或 /api/users/*"
          allowClear
        />
      </Form.Item>
      <Form.Item name="targetUrl" label="目标地址"
        rules={[{ required: true, message: "请输入目标地址" }]}
      >
        <Input
          prefix={<LinkOutlined />}
          placeholder="如 https://localhost:3000/api/users"
          allowClear
        />
      </Form.Item>

      <Form.Item name="enabled" label="启用此规则" valuePropName="checked">
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>
    </Form>
  );
};

// 优化为 React.memo 记忆组件
export default memo(BasicConfigTab);
