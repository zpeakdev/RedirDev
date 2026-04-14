import { useState, useEffect, memo } from "react";
import { Alert, Tabs, Button, Space, Empty, Form, App } from "antd";
import {
  InfoCircleOutlined,
  SaveOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { FC } from "react";
import type { RuleConfig } from "@/types/index.ts";
import BasicConfigTab from "./BasicConfigTab";
import { RuleService } from "@/shared/services/ruleService";
import { getErrorMessage } from "@/utils";

/**
 * 空状态占位内容
 *  - 未选中任何规则时显示空状态
 */
const RenderEmpty = memo(() => {
  return <section className="bg-white rounded-xl shadow-sm p-8 flex-1 flex flex-col items-center justify-center min-h-[400px]">
    <Empty
      description="请从左侧选择一条规则查看详情"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    >
      <p className="text-xs text-gray-400 mt-2">或在左侧点击「添加规则」创建新规则</p>
    </Empty>
  </section>
})

interface RuleDetailPanelProps {
  rule: RuleConfig | undefined;
}

const RuleDetailPanel: FC<RuleDetailPanelProps> = ({ rule }) => {
  const [detailForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("basic");
  const { message } = App.useApp()

  useEffect(() => {
    console.log("🚀 ~ RuleDetailPanel ~ rule:", rule)
    if (rule) {
      // 切换选中规则时，填充表单数据
      detailForm.setFieldsValue({
        matchUrl: rule.matchUrl,
        targetUrl: rule.targetUrl,
        type: rule.type,
        enabled: rule.enabled,
        proxyMethod: rule.proxyMethod,
      });
    }

    // 深度比较，避免其他rule字段变化时触发重渲染
    // 字段后续太多可这样写： [JSON.stringify(rule)]
  }, [
    rule?.id,
    rule?.matchUrl,
    rule?.targetUrl,
    rule?.type,
    rule?.enabled,
    rule?.proxyMethod
  ]);

  if (!rule) {
    return <RenderEmpty />
  }

  /** 保存修改 */
  async function handleSave() {
    try {
      await detailForm.validateFields();
      const value = detailForm.getFieldsValue(true);
      await RuleService.updateRule({ ...rule, ...value });
      message.success("规则已保存");
    } catch (error) {
      message.error(`保存失败：${getErrorMessage(error)}`);
    }
  }

  /** 刷新表单为当前规则数据 */
  function handleRefresh() {
    detailForm.setFieldsValue(rule);
  }

  // 请求/响应处理占位内容。当前只支持“代理时覆盖请求方法”。
  const proxyPlaceholder = (
    <div className="py-8">
      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        title={rule.type === "proxy" ? "代理能力仍在逐步补齐" : "重定向模式下不可编辑"}
        description={
          <span className="text-xs text-gray-500">
            当前版本中，代理规则只支持在后台转发时修改请求方法。
            请求头、请求体、响应体等更细粒度能力仍未实现。
          </span>
        }
        className="max-w-md mx-auto"
      />
    </div>
  );

  const tabItems = [
    {
      key: "basic",
      label: "基础配置",
      children: <BasicConfigTab form={detailForm} />,
    },
    {
      key: "request",
      label: "请求处理",
      children: proxyPlaceholder,
    },
    {
      key: "response",
      label: "响应处理",
      children: proxyPlaceholder,
    },
  ];

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
      <h3 className="text-base font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100">
        规则详情
      </h3>

      <Alert
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        title="注意：全局拦截开关控制所有规则的生效状态"
        className="mb-5"
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="flex-1 overflow-y-auto [&_.ant-tabs-content]:overflow-y-auto [&_.ant-tabs-tabpane]:pb-4"
      />

      <div className="flex gap-3 pt-4 border-t border-gray-100 mt-auto">
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            保存规则
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Space>
      </div>
    </section>
  );
};

export default memo(RuleDetailPanel);
