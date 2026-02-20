const chatBody = document.getElementById("chatBody");
const composer = document.getElementById("composer");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const chatMeta = document.getElementById("chatMeta");
const uiToggle = document.getElementById("uiToggle");
const fitBtn = document.getElementById("fitBtn");
const mondayStatus = document.getElementById("mondayStatus");
const mondayStatusSub = document.getElementById("mondayStatusSub");
const mondayPad = document.getElementById("mondayPad");

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

const setStatus = (main, sub) => {
  if (mondayStatus) mondayStatus.textContent = main;
  if (mondayStatusSub) mondayStatusSub.textContent = sub;
};

const padSliders = {
  P: document.getElementById("padP"),
  A: document.getElementById("padA"),
  D: document.getElementById("padD"),
};
const padVals = {
  P: document.getElementById("padPVal"),
  A: document.getElementById("padAVal"),
  D: document.getElementById("padDVal"),
};

const setPad = (pad) => {
  if (!mondayPad || !pad) return;
  const p = Number(pad.P ?? 0).toFixed(2);
  const a = Number(pad.A ?? 0).toFixed(2);
  const d = Number(pad.D ?? 0).toFixed(2);
  mondayPad.textContent = `PAD: ${p} / ${a} / ${d}`;
  // 同步滑块位置
  if (padSliders.P) { padSliders.P.value = p; padVals.P.textContent = p; }
  if (padSliders.A) { padSliders.A.value = a; padVals.A.textContent = a; }
  if (padSliders.D) { padSliders.D.value = d; padVals.D.textContent = d; }
};

const pushPad = async () => {
  const payload = {
    P: parseFloat(padSliders.P?.value ?? 0),
    A: parseFloat(padSliders.A?.value ?? 0),
    D: parseFloat(padSliders.D?.value ?? 0),
  };
  await fetch("/api/pad", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
};

["P", "A", "D"].forEach((dim) => {
  const slider = padSliders[dim];
  const valEl = padVals[dim];
  if (!slider) return;
  slider.addEventListener("input", () => {
    valEl.textContent = Number(slider.value).toFixed(2);
  });
  slider.addEventListener("change", pushPad);
});

document.getElementById("padResetBtn")?.addEventListener("click", async () => {
  ["P", "A", "D"].forEach((dim) => {
    if (padSliders[dim]) { padSliders[dim].value = 0; padVals[dim].textContent = "0.00"; }
  });
  if (mondayPad) mondayPad.textContent = "PAD: 0.00 / 0.00 / 0.00";
  await pushPad();
});

const setBeat = (text) => {
  if (!mondayStatusSub || !text) return;
  mondayStatusSub.textContent = text;
  console.log("[monday:beat]", text);
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
  return data;
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
  setStatus("聆听", "接收输入");
  addMessage("user", text);
  updateSummary(text);
  history.push({ role: "user", content: text });
  updateMeta();

  setBusy(true);
  setStatus("思考", "调酒中");
  let actionResult = "reply";
  try {
    const data = await callApi(text);
    const action = data.action || "reply";
    const delayMs = data.delay_ms || 0;
    const reply = data.reply;
    const serverState = data.state;
    setPad(data.pad);
    actionResult = action;
    if (data.beat) setBeat(data.beat);

    if (action === "silent") {
      setStatus("忙碌", "……");
      if (reply) {
        addMessage("assistant", reply);
        history.push({ role: "assistant", content: reply });
        updateMeta();
      }
      return;
    }

    const emitReply = () => {
      if (reply) {
        addMessage("assistant", reply);
        history.push({ role: "assistant", content: reply });
        updateMeta();
      }
      if (serverState === "Working") {
        setStatus("忙碌", "稍后回应");
      } else if (serverState === "Listening") {
        setStatus("聆听", "在听");
      } else {
        setStatus("回应", "已输出");
      }
    };

    if (delayMs > 0) {
      setStatus("忙碌", `延迟 ${Math.round(delayMs / 100) / 10}s`);
      setTimeout(emitReply, delayMs);
    } else {
      emitReply();
    }
  } catch (error) {
    addMessage("assistant", `接口出错：${error.message}`);
    console.error("[chat:error]", error);
    setStatus("出错", "请求失败");
  } finally {
    setBusy(false);
    input.focus();
    const resetDelay = actionResult === "silent" ? 1600 : 800;
    setTimeout(() => setStatus("闲置", "等待输入"), resetDelay);
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

const BOOT_LINES = [
  "你来了？先别演，直接说你要解决的事。别怕，我不会安慰你。",
  "又是这个时间点。坐下，说。",
  "今晚不忙，你运气不错。说吧。",
  "进来就好，站在门口没人欠你一个招呼。说你的事。",
  "嗯。来了。",
  "怎么了？脸上写着事。",
  "你看起来需要一杯，还是需要一个耳朵？",
  "今晚什么把你带到这儿来了？",
  "别想着我有多闲。但你既然来了，说吧。",
];

const boot = () => {
  const line = BOOT_LINES[Math.floor(Math.random() * BOOT_LINES.length)];
  addMessage("assistant", line);
  history.push({
    role: "assistant",
    content: line,
  });
  updateMeta();
  setStatus("闲置", "等待输入");
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
