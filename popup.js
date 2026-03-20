(() => {
  // Popup 页面逻辑：读写 `chrome.storage.local`，让 service worker 在后台同步动态规则。
  // MV3 里 popup 是“短生命周期”页面：关闭后页面脚本会销毁，但 storage 中的数据会保留，
  // 因此我们把“规则数据”持久化放在 storage，真正的重定向由 background 动态规则维护。

  const el = {
    enabled: document.getElementById("enabled"),
    matchUrl: document.getElementById("matchUrl"),
    redirectUrl: document.getElementById("redirectUrl"),
    saveBtn: document.getElementById("saveBtn"),
    status: document.getElementById("status"),
    rulesList: document.getElementById("rulesList"),
    ruleCount: document.getElementById("ruleCount"),
  };

  function setStatus(message) {
    el.status.textContent = message || "";
  }

  function renderRules(rules) {
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

  function getStoredDefaults() {
    return { enabled: false, rules: [] };
  }

  async function loadAndRender() {
    const state = await chrome.storage.local.get(getStoredDefaults());
    el.enabled.checked = Boolean(state.enabled);
    renderRules(Array.isArray(state.rules) ? state.rules : []);
  }

  function validateInput(matchUrl, redirectUrl) {
    const m = (matchUrl || "").trim();
    const r = (redirectUrl || "").trim();
    if (!m) return { ok: false, message: "请输入“匹配规则(URL)”" };
    if (!r) return { ok: false, message: "请输入“目标地址(Redirect URL)”" };
    return { ok: true, matchUrl: m, redirectUrl: r };
  }

  async function addRule() {
    const matchUrl = el.matchUrl.value;
    const redirectUrl = el.redirectUrl.value;
    const v = validateInput(matchUrl, redirectUrl);
    if (!v.ok) {
      setStatus(v.message);
      return;
    }

    const state = await chrome.storage.local.get(getStoredDefaults());
    const rules = Array.isArray(state.rules) ? state.rules.slice() : [];
    rules.push({ matchUrl: v.matchUrl, redirectUrl: v.redirectUrl });

    await chrome.storage.local.set({ rules });
    setStatus("已保存，后台将立即同步规则。");
    el.matchUrl.value = "";
    el.redirectUrl.value = "";
  }

  async function deleteRuleAt(index) {
    const state = await chrome.storage.local.get(getStoredDefaults());
    const rules = Array.isArray(state.rules) ? state.rules.slice() : [];
    if (index < 0 || index >= rules.length) return;

    rules.splice(index, 1);
    await chrome.storage.local.set({ rules });
  }

  function wireEvents() {
    el.saveBtn.addEventListener("click", async () => {
      try {
        await addRule();
      } catch (e) {
        setStatus(`保存失败：${e && e.message ? e.message : String(e)}`);
      }
    });

    // 开关：只改 enabled，background 负责清除/添加动态规则
    el.enabled.addEventListener("change", async () => {
      try {
        await chrome.storage.local.set({ enabled: el.enabled.checked });
      } catch (e) {
        setStatus(`更新开关失败：${e && e.message ? e.message : String(e)}`);
      }
    });

    // 删除按钮：使用事件委托，避免为每条规则单独绑定监听器
    el.rulesList.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action === "delete") {
        const idx = Number(target.dataset.index);
        try {
          await deleteRuleAt(idx);
          setStatus("已删除，后台将立即同步规则。");
        } catch (e) {
          setStatus(`删除失败：${e && e.message ? e.message : String(e)}`);
        }
      }
    });

    // 当 background 端或其他入口修改 storage 时，刷新 UI
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.enabled || changes.rules) loadAndRender();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // 在 MV3 中，popup 会在打开时创建并执行脚本；因此每次打开都要从 storage 加载最新状态。
    setStatus("");
    await loadAndRender();
    wireEvents();
  });
})();

