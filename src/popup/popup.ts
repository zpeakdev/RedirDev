import type { RuleConfig } from "../utils/storage.js";
import { getStoredState } from "../utils/storage.js";


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



function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`缺少必需元素: #${id}`);
  }
  return element as T;
}

/**
 * Popup 页面入口（MV3）
 *
 * 角色定位：
 * - 只负责“编辑/展示规则数据”和“开关(enabled)状态”。
 * - 真正的重定向通过 `background service worker` 中的动态规则实现。
 *
 * 生命周期原因（为什么要用 storage 作为数据源）：
 * - `popup` 是短生命周期页面：关闭后内存会销毁，但 `chrome.storage.local` 持久化不会丢失。
 * - 因此本页面始终以 storage 为单一数据源（source of truth），并通过写 storage 触发 background 同步。
 */
(() => {
  // Popup 页面逻辑：读写 `chrome.storage.local`，让 service worker 在后台同步动态规则。
  // MV3 里 popup 是“短生命周期”页面：关闭后页面脚本会销毁，但 storage 中的数据会保留，
  // 因此我们把“规则数据”持久化放在 storage，真正的重定向由 background 动态规则维护。

  const el = {
    enabled: getRequiredElement<HTMLInputElement>("enabled"),
    matchUrl: getRequiredElement<HTMLInputElement>("matchUrl"),
    redirectUrl: getRequiredElement<HTMLInputElement>("redirectUrl"),
    saveBtn: getRequiredElement<HTMLButtonElement>("saveBtn"),
    status: getRequiredElement<HTMLDivElement>("status"),
    rulesList: getRequiredElement<HTMLDivElement>("rulesList"),
    ruleCount: getRequiredElement<HTMLSpanElement>("ruleCount")
  };

  /**
   * 设置状态文本（UI 层提示）。
   * @param message 要展示给用户的状态信息
   */
  function setStatus(message: string): void {
    el.status.textContent = message;
  }

  /**
   * 根据规则数组渲染规则列表。
   *
   * 实现细节：
   * - 每条规则都生成一个 DOM 条目，同时在删除按钮上写入 `data-index`。
   * - 删除逻辑采用事件委托：点击列表时从事件 target 的 dataset 解析要删除的下标。
   *
   * @param rules 要展示的规则数组（顺序与 storage 中保持一致）
   */
  function renderRules(rules: RuleConfig[]): void {
    el.rulesList.innerHTML = "";
    el.ruleCount.textContent = `${rules.length} 条`;

    rules.forEach((r, index) => {
      const item = document.createElement("div");
      item.className = "ruleItem";

      const text = document.createElement("div");
      text.className = "ruleText";
      text.textContent = `匹配：${r.matchUrl}\n重定向：${r.redirectUrl}`;

      const actions = document.createElement("div");
      actions.className = "ruleActions";

      const delBtn = document.createElement("button");
      delBtn.className = "dangerBtn";
      delBtn.type = "button";
      delBtn.textContent = "删除";
      delBtn.dataset.action = "delete";
      delBtn.dataset.index = String(index);

      actions.appendChild(delBtn);
      item.appendChild(text);
      item.appendChild(actions);
      el.rulesList.appendChild(item);
    });
  }

  /**
   * 加载 storage 的最新状态，并刷新 UI（开关 + 规则列表）。
   */
  async function loadAndRender(): Promise<void> {
    const state = await getStoredState();
    el.enabled.checked = state.enabled;
    renderRules(state.rules);
  }

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

  /**
   * 将用户输入的规则追加到 storage。
   *
   * 关键点：
   * - 先校验（确保写入 storage 的数据始终可用）。
   * - 读取后使用 `slice()`/复制生成新数组再 `push`，避免直接修改旧引用。
   * - 成功后清空输入并提示：background 将基于新 storage 状态立即同步动态规则。
   */
  async function addRule(): Promise<void> {
    const v = validateInput(el.matchUrl.value, el.redirectUrl.value);
    if (!v.ok) {
      setStatus(v.message);
      return;
    }

    const state = await getStoredState();
    const rules = state.rules.slice();
    rules.push({ matchUrl: v.matchUrl, redirectUrl: v.redirectUrl });

    await chrome.storage.local.set({ rules });
    setStatus("已保存，后台将立即同步规则。");
    el.matchUrl.value = "";
    el.redirectUrl.value = "";
  }

  /**
   * 删除某个下标位置的规则并写回 storage。
   * @param index 要删除的规则下标（与 UI 展示顺序一致）
   */
  async function deleteRuleAt(index: number): Promise<void> {
    const state = await getStoredState();
    const rules = state.rules.slice();
    if (index < 0 || index >= rules.length) return;

    rules.splice(index, 1);
    await chrome.storage.local.set({ rules });
  }

  /**
   * 把异常对象转换成可展示的字符串。
   * @param error 捕获到的异常（unknown）
   * @returns 适合直接展示在 UI 上的错误信息
   */
  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /**
   * 绑定所有 UI 与 storage 相关事件。
   *
   * 事件来源：
   * - `saveBtn`：添加规则 => 写 storage => background 同步。
   * - `enabled`：切换开关 => 仅写 enabled => background 负责清除/添加动态规则。
   * - `rulesList`：删除按钮事件委托 => 写 rules => background 同步。
   * - `chrome.storage.onChanged`：来自其他入口/后台更新 => 触发重新渲染。
   */
  function wireEvents(): void {
    el.saveBtn.addEventListener("click", async () => {
      try {
        await addRule();
      } catch (error: unknown) {
        setStatus(`保存失败：${getErrorMessage(error)}`);
      }
    });

    // 开关：只改 enabled，background 负责清除/添加动态规则
    el.enabled.addEventListener("change", async () => {
      try {
        await chrome.storage.local.set({ enabled: el.enabled.checked });
      } catch (error: unknown) {
        setStatus(`更新开关失败：${getErrorMessage(error)}`);
      }
    });

    // 删除按钮：使用事件委托，避免为每条规则单独绑定监听器
    el.rulesList.addEventListener("click", async (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action === "delete") {
        const idx = Number(target.dataset.index);
        // `data-index` 来自当前 UI 渲染时的顺序；由 storage 状态驱动 UI，因此删除后需要再渲染（由 onChanged 触发）。
        try {
          await deleteRuleAt(idx);
          setStatus("已删除，后台将立即同步规则。");
        } catch (error: unknown) {
          setStatus(`删除失败：${getErrorMessage(error)}`);
        }
      }
    });

    // 当 background 端或其他入口修改 storage 时，刷新 UI
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.enabled || changes.rules) {
        void loadAndRender();
      }
    });
  }

  /**
   * popup 打开后的初始化入口。
   * @remarks
   * - 在 MV3 中 popup 打开时会创建并执行脚本；因此每次打开都会执行一次加载与渲染。
   * - 这里将 `setStatus("")` 作为“清空旧提示”的显式行为，然后从 storage 拉取最新状态并绑定事件。
   */
  document.addEventListener("DOMContentLoaded", async () => {
    // 在 MV3 中，popup 会在打开时创建并执行脚本；因此每次打开都要从 storage 加载最新状态。
    setStatus("");
    await loadAndRender();
    wireEvents();
  });
})();

export { };
