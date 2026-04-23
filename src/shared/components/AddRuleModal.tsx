import type { FormInstance } from "antd";
import { Modal, Alert } from "antd";
import { type FC } from "react";
import RuleForm from "@/shared/components/RuleForm.tsx";

interface AddRuleModalProps {
  open: boolean;
  isEdit: boolean;
  modalForm: FormInstance;
  onClose: () => void;
  onSubmit: () => void;
}

const AddRuleModal: FC<AddRuleModalProps> = ({ open, isEdit, modalForm, onClose, onSubmit }) => {
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
            当前已支持基础 <strong>代理</strong> 模式：命中规则后会由扩展后台转发请求。
            现阶段仅实现“代理时修改请求方法”，请求头、请求体和响应改写仍待后续版本补齐。
          </span>
        }
      />

      <RuleForm form={modalForm} />
    </Modal>
  );
};

export default AddRuleModal;
