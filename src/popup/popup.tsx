import { useCallback, useEffect, useState } from "react";
import type { RuleConfig } from "../utils/storage.ts";
import { getStoredState } from "../utils/storage.ts";
import { getErrorMessage } from "../utils";
import './popup.css'


type ValidInput = {
  ok: true;
  matchUrl: string;
  redirectUrl: string;
};

type InvalidInput = {
  ok: false;
  message: string;
};

type ValidateResult = ValidInput | InvalidInput;
/**
* 校验输入框内容并对有效值做清洗（trim）。
* @param matchUrl 匹配规则 URL
* @param redirectUrl 目标地址（Redirect URL）
* @returns 校验结果：
* - `ok=true`：返回清洗后的字符串。
* - `ok=false`：返回对应的用户提示文案。
*/
function validateInput(
  matchUrl: string,
  redirectUrl: string
): ValidateResult {
  const m = (matchUrl || "").trim();
  const r = (redirectUrl || "").trim();
  if (!m) return { ok: false, message: "请输入“匹配规则(URL)”" };
  if (!r) return { ok: false, message: "请输入“目标地址(Redirect URL)”" };
  return { ok: true, matchUrl: m, redirectUrl: r };
}


function Popup() {

  const [enabled, setEnabled] = useState(false)
  const [rules, setRules] = useState<RuleConfig[]>([])
  const [matchUrl, setMatchUrl] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [statusText, setStatusText] = useState('')


  /**
   * 加载 storage 的最新状态，并刷新 UI（开关 + 规则列表）
   * @see https://zh-hans.react.dev/reference/react/useCallback
   */
  const loadStorageState = useCallback(async () => {
    try {
      const state = await getStoredState();
      setEnabled(state.enabled);
      setRules(state.rules);
    } catch (error) {
      setStatusText(`加载失败：${getErrorMessage(error)}`)
    }
  }, [])



  useEffect(() => {
    loadStorageState() // 初始化时加载一次

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return
      if (changes.enabled || changes.rules) {
        loadStorageState()
      }
    }
    // 监听 storage 变化事件(popup、background 等入口修改)，刷新 UI 状态
    chrome.storage.onChanged.addListener(handleStorageChange)

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])


  /**
   * 保存并添加规则。
   */
  async function handleAddRule(): Promise<void> {
    try {
      const result = validateInput(matchUrl, redirectUrl);
      if (!result.ok) {
        setStatusText(result.message);
        return;
      }

      const { rules } = await getStoredState();
      rules.push({ matchUrl: result.matchUrl, redirectUrl: result.redirectUrl });
      await chrome.storage.local.set({ rules });

      setStatusText('已保存，后台将立即同步规则。');
      setMatchUrl('');
      setRedirectUrl('');
    } catch (error) {
      setStatusText(`保存失败：${getErrorMessage(error)}`)
    }
  }

  /**
   * 删除某个下标位置的规则并写回 storage。
   * @param index 要删除的规则下标（与 UI 展示顺序一致）
   */
  async function handleDeleteRule(index: number): Promise<void> {
    try {
      const newRules = rules?.filter((_, i) => i !== index);
      await chrome.storage.local.set({ rules: newRules || [] });
      setStatusText('已删除规则。');
    } catch (error) {
      setStatusText(`删除失败：${getErrorMessage(error)}`)
    }
  }

  /**
   * 切换启用状态并写回 storage。
   */
  async function handleEnabledChange(): Promise<void> {
    try {
      await chrome.storage.local.set({ enabled: !enabled });
      setStatusText(`已切换到 ${enabled ? '禁用' : '启用'} 状态。`);
    } catch (error) {
      setStatusText(`切换失败：${getErrorMessage(error)}`)
    }
  }

  return (
    <div className="container">
      <h1 className="title">网络拦截与重定向</h1>

      <label className="row toggle">
        <span>启用</span>
        <input id="enabled" checked={enabled} type="checkbox" onChange={handleEnabledChange} />
      </label>

      <div className="section">
        <label className="field">
          <span>匹配规则 (URL)</span>
          <input
            id="matchUrl"
            type="text"
            placeholder="例如：example.com 或 *://example.com/*"
            value={matchUrl}
            onChange={(e) => setMatchUrl(e.target.value)}
          />
        </label>

        <label className="field">
          <span>目标地址 (Redirect URL)</span>
          <input
            id="redirectUrl"
            type="text"
            placeholder="例如：https://example.com/new"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
          />
        </label>
      </div>

      <button id="saveBtn" className="btn" type="button" onClick={handleAddRule}>保存并添加规则</button>
      <div id="status" className="status" aria-live="polite">{statusText}</div>

      <div className="section list">
        <div className="listHeader">
          <strong>已保存规则</strong>
          <span id="ruleCount" className="muted">{rules.length} 条</span>
        </div>
        <div id="rulesList" className="rulesList">
          {rules.map((rule, index) => (
            <div key={index} className="ruleItem">
              <div className="ruleText">
                匹配：{rule.matchUrl}
                <br />
                重定向：{rule.redirectUrl}
              </div>
              <div className="ruleActions">
                <button
                  className="dangerBtn"
                  type="button"
                  onClick={() => handleDeleteRule(index)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Popup
