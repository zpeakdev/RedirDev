import { Modal, FormInstance, Alert } from "antd";
import { type FC, useEffect } from "react";
import type { RuleConfig } from "@/types/index.ts";
import RuleForm from "@/shared/components/RuleForm.tsx";

interface AddRuleModalProps {
  open: boolean;
  isEdit: boolean;
  initRule: RuleConfig | undefined;
  modalForm: FormInstance;
  onClose: () => void;
  onSubmit: () => void;
}

const AddRuleModal: FC<AddRuleModalProps> = ({
  open,
  isEdit,
  initRule,
  modalForm,
  onClose,
  onSubmit,
  ...props
}) => {
  // 当弹窗打开或初始化数据变化时，重置表单
  useEffect(() => {
    if (open) {
      if (initRule) {
        // 编辑模式：设置表单值
        modalForm.setFieldsValue(initRule);
      } else {
        // 添加模式：重置表单
        modalForm.resetFields();
      }
    }
  }, [open, initRule, modalForm]);

  return (
    <Modal
      title={!isEdit ? "添加新规则" : "编辑规则"}
      open={open}
      onOk={onSubmit}
      onCancel={onClose}
      okText={!isEdit ? "创建规则" : "保存"}
      cancelText="取消"
      width={520}
      destroyOnHidden
      {...props}
    >
      <Alert
        type="info"
        showIcon
        className="my-3"
        title="重定向 vs 代理说明"
        description={
          <span className="text-xs">
            当前仅支持<strong>重定向</strong>模式：将匹配的请求直接转发到目标地址。
            代理模式（可修改请求/响应）即将在后续版本推出。
          </span>
        }
      />

      <RuleForm form={modalForm} initialValues={initRule} />
    </Modal>
  );
};

export default AddRuleModal;
