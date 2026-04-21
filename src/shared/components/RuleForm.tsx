import React from "react";
import { Form, FormInstance, Input, Switch, Radio, Select } from "antd";
import { SearchOutlined, LinkOutlined } from "@ant-design/icons";
import { useStorageState } from "@/shared/hooks/useStorageState";
import { PROXY_METHOD_OPTIONS } from "@/types/index";

interface RuleFormProps {
  form: FormInstance;
}

const RuleForm: React.FC<RuleFormProps> = ({ form }) => {
  const ruleType = Form.useWatch("type", form) ?? "redirect";
  const currentRuleId = Form.useWatch<string>("id", { form, preserve: true }); // 保留当前规则id
  const { rules: storedRules } = useStorageState();

  return (
    <Form
      form={form}
      layout="vertical"
      className="mt-4"
      initialValues={{ enabled: true, type: "redirect", proxyMethod: "GET" }}
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
        rules={[
          { required: true, whitespace: true, message: "请输入匹配规则" },
          {
            validator: async (_, value) => {
              const inputMatchUrl = String(value ?? "").trim();
              if (!inputMatchUrl) return;

              // 检查是否存在重复的匹配规则
              const isDuplicate = storedRules.some((r) => {
                if (currentRuleId && r.id === currentRuleId) return false; // 跳过当前规则
                return r.matchUrl === inputMatchUrl;
              });

              if (isDuplicate) {
                throw new Error("匹配规则已存在，请勿重复添加");
              }
            }
          }
        ]}
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
      {ruleType === "proxy" ? (
        <Form.Item
          name="proxyMethod"
          label="代理请求方法"
          rules={[{ required: true, message: "请选择代理请求方法" }]}
          preserve={false}
          extra="当前最小实现仅支持代理后修改请求方法，例如把 GET 转成 POST。"
        >
          <Select
            options={PROXY_METHOD_OPTIONS}
            placeholder="请选择转发时使用的请求方法"
          />
        </Form.Item>
      ) : null}
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
