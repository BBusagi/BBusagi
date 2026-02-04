const chatBody = document.getElementById("chatBody");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const chatMeta = document.getElementById("chatMeta");
const uiToggle = document.getElementById("uiToggle");
const fitBtn = document.getElementById("fitBtn");

let uiHidden = false;

let history = [];
let summaryBullets = [];

const updateMeta = () => {
  chatMeta.textContent = `${history.length} 条对话`;
};

const addMessage = (role, text) => {
  const message = document.createElement("div");
  message.className = `message ${role}`;

  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "user" ? "你" : "Monday";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  message.appendChild(label);
  message.appendChild(bubble);
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;
  console.log(`[chat:${role}]`, text);
};

const updateSummary = (userText) => {
  const trimmed = userText.replace(/\s+/g, " ").slice(0, 30);
  summaryBullets.push(`用户提到：${trimmed}`);
  if (summaryBullets.length > 3) summaryBullets.shift();
};

const callApi = async (message) => {
  const payload = {
    message,
    history: history.slice(-3),
    summary: summaryBullets,
  };

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "请求失败");
  }

  const data = await response.json();
  return data.reply;
};

const setBusy = (busy) => {
  sendBtn.disabled = busy;
  input.disabled = busy;
  sendBtn.textContent = busy ? "调酒中" : "上酒";
};

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addMessage("user", text);
  updateSummary(text);
  history.push({ role: "user", content: text });
  updateMeta();

  setBusy(true);
  try {
    const reply = await callApi(text);
    addMessage("assistant", reply);
    history.push({ role: "assistant", content: reply });
    updateMeta();
  } catch (error) {
    addMessage("assistant", `接口出错：${error.message}`);
    console.error("[chat:error]", error);
  } finally {
    setBusy(false);
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

const boot = () => {
  addMessage(
    "assistant",
    "你来了？先别演，直接说你要解决的事。别怕，我不会安慰你。"
  );
  history.push({
    role: "assistant",
    content: "你来了？先别演，直接说你要解决的事。别怕，我不会安慰你。",
  });
  updateMeta();
};

boot();

uiToggle.addEventListener("click", () => {
  uiHidden = !uiHidden;
  document.body.classList.toggle("ui-hidden", uiHidden);
  uiToggle.textContent = uiHidden ? "显示界面" : "隐藏界面";
});

if (fitBtn) {
  fitBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    window.location.assign("fittingroom.html");
  });
}
