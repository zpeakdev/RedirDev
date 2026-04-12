import { Modal, FormInstance, Alert } from "antd";
import { type FC } from "react";
import RuleForm from "@/shared/components/RuleForm.tsx";

interface AddRuleModalProps {
  open: boolean;
  isEdit: boolean;
  modalForm: FormInstance;
  onClose: () => void;
  onSubmit: () => void;
}

const AddRuleModal: FC<AddRuleModalProps> = ({
  open,
  isEdit,
  modalForm,
  onClose,
  onSubmit,
}) => {
  return (
    <Modal
      title={!isEdit ? "添加新规则" : "编辑规则"}
      open={open}
      onOk={onSubmit}
      onCancel={onClose}
      okText={!isEdit ? "创建规则" : "保存"}
      cancelText="取消"
      width={520}
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

      <RuleForm form={modalForm} />
    </Modal>
  );
};

export default AddRuleModal;
