import { Form, Input, Switch, Radio, Select } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";
import { memo } from "react";
import type { FormInstance } from "antd";

interface BasicConfigTabProps {
  form: FormInstance;
}

const PROXY_METHOD_OPTIONS = [
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "PATCH", value: "PATCH" },
  { label: "DELETE", value: "DELETE" },
  { label: "HEAD", value: "HEAD" },
  { label: "OPTIONS", value: "OPTIONS" }
];

function BasicConfigTab({ form }: BasicConfigTabProps) {
  const ruleType = Form.useWatch("type", form) ?? "redirect";

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
      {ruleType === "proxy" ? (
        <Form.Item
          name="proxyMethod"
          label="代理请求方法"
          rules={[{ required: true, message: "请选择代理请求方法" }]}
          preserve={false}
          extra="当前只支持代理时改请求方法，例如把原请求从 GET 转成 POST。"
        >
          <Select
            options={PROXY_METHOD_OPTIONS}
            placeholder="请选择代理请求方法"
          />
        </Form.Item>
      ) : null}

      <Form.Item name="enabled" label="启用此规则" valuePropName="checked">
        <Switch checkedChildren="启用" unCheckedChildren="禁用" />
      </Form.Item>
    </Form>
  );
};

// 优化为 React.memo 记忆组件
export default memo(BasicConfigTab);
