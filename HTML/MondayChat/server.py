import json
import os
import pathlib
import random
import time
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer

BASE_DIR = pathlib.Path(__file__).resolve().parent
HOST = os.environ.get("MONDAYCHAT_HOST", "127.0.0.1")
DEFAULT_PORT = 8787
SYSTEM_PROMPT_PATH = BASE_DIR / "LLM" / "system_prompt.txt"

# Simple in-memory state (single-user POC)
MOOD = 0.0  # legacy scalar, kept for compatibility
STATE = "Idle"
NORMAL_STREAK = 0
# PAD model: Pleasure, Arousal, Dominance in [-1, 1]
PAD = {"P": 0.0, "A": 0.0, "D": 0.0}
LAST_REPLY_TS = 0.0


def load_system_prompt():
    if not SYSTEM_PROMPT_PATH.exists():
        raise RuntimeError("未找到系统提示词文件：LLM/system_prompt.txt")
    return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8").strip()


def build_user_prompt(message, history, summary):
    summary_text = "\n".join(f"- {item}" for item in summary) if summary else "- （空）"
    history_text = "\n".join(
        f"{turn['role']}: {turn['content']}" for turn in history
    ) if history else "（无）"

    return (
        "以下是最近对话和摘要，请延续语境。\n"
        f"会话摘要：\n{summary_text}\n\n"
        f"最近 3 轮对话：\n{history_text}\n\n"
        f"用户最新发言：{message}\n"
    )


def build_mood_context(pad, mood):
    """将当前PAD情绪状态翻译为中文风格指令，追加到system prompt尾部。
    中性状态时返回空字符串（不影响基础人格）。"""
    P_WARM = [
        "语气略微轻快一些，回应可以稍微放开。",
        "今晚状态不错，话可以稍多一点。",
        "可以比平时多说半句。",
    ]
    P_COLD = [
        "回应更简短，语气收紧，不要多解释。",
        "今晚话不多，点到为止。",
        "少说，能省则省，语气平淡。",
    ]
    A_TENSE = [
        "节奏稍快，句子简练，不拖。",
        "语气带一点暗劲，不拖泥带水。",
        "说话干脆，不绕弯。",
    ]
    A_CALM = [
        "节奏放慢，语气沉稳，不急。",
        "说话慢条斯理，可以停顿。",
        "今晚状态很平，说话不紧不慢。",
    ]
    D_GUARDED = [
        "对方语气强硬，你不需要迎合，保持自己的节奏。",
        "不用降低姿态，该怎样就怎样。",
        "不被催，不被压，按自己的步调回应。",
    ]
    D_YIELDING = [
        "对方比较客气，可以稍微放松一点。",
        "今晚这位客人还不错，态度可以略微温和。",
    ]
    MOOD_OVERRIDE = [
        "这一晚不想多说，能沉默就沉默，开口也不超过两句。",
        "回应降到最低限度，不主动展开任何话题。",
    ]

    clauses = []

    # MOOD极端低值优先覆盖P维度
    if mood <= -1.0:
        clauses.append(random.choice(MOOD_OVERRIDE))
    else:
        if pad["P"] >= 0.35:
            clauses.append(random.choice(P_WARM))
        elif pad["P"] <= -0.35:
            clauses.append(random.choice(P_COLD))

    # A维度独立判断
    if pad["A"] >= 0.40:
        clauses.append(random.choice(A_TENSE))
    elif pad["A"] <= -0.25:
        clauses.append(random.choice(A_CALM))

    # D维度独立判断
    if pad["D"] >= 0.30:
        clauses.append(random.choice(D_GUARDED))
    elif pad["D"] <= -0.30:
        clauses.append(random.choice(D_YIELDING))

    if not clauses:
        return ""  # 中性状态，不干预

    lines = ["当前状态参考（仅影响本次回应风格，不要提及）："]
    for c in clauses:
        lines.append(f"- {c}")
    return "\n".join(lines)


def pick_response_mode(pad, clear_req, mood):
    """随机选择本轮的对话风格提示，注入到 user_prompt 末尾。
    返回提示字符串；直接回应模式时返回空字符串。"""
    weights = {"direct": 0.50, "question": 0.20, "observe": 0.15, "redirect": 0.15}

    if clear_req:
        weights["direct"] += 0.15
        weights["question"] -= 0.05
        weights["observe"] -= 0.05
        weights["redirect"] -= 0.05

    if pad["P"] < -0.3:
        weights["direct"] -= 0.1
        weights["redirect"] += 0.1

    if pad["A"] > 0.4:
        weights["direct"] -= 0.1
        weights["question"] += 0.1

    MODE_HINTS = {
        "direct": "",
        "question": "以问题收尾——说说你自己真正想问的，不是为了让对话继续，是真的想知道。",
        "observe": "说一个你自己注意到的东西，可以和对方说的有关，也可以无关。",
        "redirect": "接住对方的话，但带去你觉得更值得谈的方向。",
    }

    total = sum(weights.values())
    roll = random.random() * total
    cumulative = 0.0
    for mode, weight in weights.items():
        cumulative += weight
        if roll < cumulative:
            return MODE_HINTS[mode]
    return ""


def call_openai(system_prompt, user_prompt):
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        key_path = BASE_DIR / "openai.key"
        if key_path.exists():
            api_key = key_path.read_text(encoding="utf-8").strip()
    if not api_key:
        raise RuntimeError("未检测到 OPENAI_API_KEY 环境变量或 openai.key 文件")

    payload = {
        "model": "gpt-4.1-mini",
        "instructions": system_prompt,
        "input": user_prompt,
        "temperature": 0.8,
        "max_output_tokens": 180,
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"OpenAI 请求失败：HTTP {err.code} {err.reason} - {detail}")

    output_text = data.get("output_text")
    if output_text:
        return output_text.strip()

    # Fallback: traverse output content
    for item in data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text":
                return content.get("text", "").strip()

    raise RuntimeError("OpenAI 响应为空")


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_file(self, path):
        print(f"Attempting to serve: {path}")
        print(f"Path exists: {path.exists()}, Is file: {path.is_file()}")
        if not path.exists() or not path.is_file():
            print("Path check failed, sending 404")
            self.send_error(404)
            return

        content = path.read_bytes()
        if path.suffix == ".html":
            content_type = "text/html; charset=utf-8"
        elif path.suffix == ".css":
            content_type = "text/css; charset=utf-8"
        elif path.suffix == ".js":
            content_type = "application/javascript; charset=utf-8"
        else:
            content_type = "application/octet-stream"

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        if path.suffix in {".html", ".js", ".css"}:
            self.send_header("Cache-Control", "no-store")
        else:
            self.send_header("Cache-Control", "public, max-age=86400")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        if self.path == "/":
            return self._send_file(BASE_DIR / "index.html")
        if self.path.startswith("/"):
            target = (BASE_DIR / self.path.lstrip("/")).resolve()
            if BASE_DIR in target.parents or BASE_DIR == target:
                return self._send_file(target)
        self.send_error(404)

    def do_POST(self):
        global PAD, MOOD, STATE, NORMAL_STREAK, LAST_REPLY_TS

        if self.path == "/api/pad":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                return self._send_json(400, {"error": "无效 JSON"})
            for key in ("P", "A", "D"):
                if key in payload:
                    PAD[key] = max(-1.0, min(1.0, float(payload[key])))
            if "mood" in payload:
                MOOD = max(-2.0, min(2.0, float(payload["mood"])))
            return self._send_json(200, {"pad": PAD, "mood": round(MOOD, 2)})

        if self.path != "/api/chat":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            return self._send_json(400, {"error": "无效 JSON"})

        message = (payload.get("message") or "").strip()
        history = payload.get("history") or []
        summary = payload.get("summary") or []

        if not message:
            return self._send_json(400, {"error": "消息为空"})

        def has_clear_request(text):
            markers = ["?", "？", "请", "能否", "可以", "帮我", "如何", "怎么", "需要", "想要"]
            return any(m in text for m in markers)

        def is_negative(text):
            negatives = [
                "烦", "讨厌", "崩溃", "难受", "痛苦", "焦虑", "抑郁", "生气",
                "无聊", "没意义", "糟糕", "受不了", "想哭", "压力"
            ]
            return any(n in text for n in negatives)

        def is_positive(text):
            positives = ["谢谢", "感激", "开心", "轻松", "太好了", "好消息", "满意"]
            return any(p in text for p in positives)

        def is_dominant(text):
            dominant = ["必须", "现在", "立刻", "马上", "给我", "别废话"]
            return any(d in text for d in dominant)

        def pick_beat(action, pad, clear_req):
            calm = [
                "擦了擦杯口。",
                "把冰夹放回托盘。",
                "调整了吧台灯光。",
                "把抹布搭到肩上。",
            ]
            guarded = [
                "抬眼看了你一秒。",
                "没有抬头。",
                "手上动作没停。",
                "敲了敲杯沿。",
            ]
            tense = [
                "杯子轻轻碰了一下。",
                "把酒瓶挪远。",
                "拧紧了瓶盖。",
            ]
            if action == "silent":
                pool = guarded if pad["P"] < 0 else calm
            elif pad["A"] > 0.4:
                pool = tense
            elif clear_req:
                pool = calm
            else:
                pool = guarded
            return random.choice(pool)

        negative = is_negative(message)
        positive = is_positive(message)
        dominant = is_dominant(message)
        clear_req = has_clear_request(message)

        if negative:
            MOOD = max(-2.0, MOOD - 0.3)
            NORMAL_STREAK = 0
            PAD["P"] = max(-1.0, PAD["P"] - 0.15)
            PAD["A"] = min(1.0, PAD["A"] + 0.1)
        else:
            NORMAL_STREAK += 1
            if NORMAL_STREAK >= 3:
                MOOD = min(2.0, MOOD + 0.2)
                NORMAL_STREAK = 0
                PAD["P"] = min(1.0, PAD["P"] + 0.1)
                PAD["A"] = max(-1.0, PAD["A"] - 0.05)

        if positive:
            PAD["P"] = min(1.0, PAD["P"] + 0.1)
        if dominant:
            PAD["D"] = min(1.0, PAD["D"] + 0.15)
        else:
            PAD["D"] = max(-1.0, PAD["D"] - 0.05)

        # Business baseline: default to normal replies
        silent_prob = 0.03
        short_prob = 0.08
        delay_prob = 0.2

        if not clear_req:
            short_prob += 0.08

        # Only allow silence when likeability is very low
        if MOOD <= -1.2:
            silent_prob += 0.35
            short_prob += 0.05
            delay_prob += 0.15
        elif MOOD <= -0.8:
            silent_prob += 0.1
            short_prob += 0.02

        # PAD influence
        # Low pleasure -> more short/delay; silence only when MOOD is low
        if PAD["P"] < -0.3:
            short_prob += 0.03
        if PAD["A"] > 0.4:
            delay_prob += 0.1
            short_prob += 0.05

        now = time.time()
        time_since_reply = now - LAST_REPLY_TS if LAST_REPLY_TS else 999

        # If replies are too frequent, increase silence/shortness
        if time_since_reply < 4:
            short_prob += 0.05
            delay_prob += 0.1

        roll = random.random()
        if roll < silent_prob:
            action = "silent"
            STATE = "Working"
        elif roll < silent_prob + short_prob:
            action = "short"
            STATE = "Listening"
        else:
            action = "reply"
            STATE = "Responding"

        delay_ms = 0
        if action == "reply" and random.random() < delay_prob:
            delay_ms = random.randint(800, 3500)
            STATE = "Working"

        if action == "silent":
            beat = pick_beat(action, PAD, clear_req)
            LAST_REPLY_TS = time.time()
            return self._send_json(200, {
                "action": action,
                "delay_ms": 0,
                "reply": "...",
                "beat": beat,
                "state": STATE,
                "mood": round(MOOD, 2),
                "pad": PAD,
            })

        if action == "short":
            short_pool = [
                "好，继续。",
                "明白。",
                "说重点就行。",
                "我在听。",
                "先记下了。",
            ]
            beat = pick_beat(action, PAD, clear_req)
            LAST_REPLY_TS = time.time()
            return self._send_json(200, {
                "action": action,
                "delay_ms": 0,
                "reply": random.choice(short_pool),
                "beat": beat,
                "state": STATE,
                "mood": round(MOOD, 2),
                "pad": PAD,
            })

        user_prompt = build_user_prompt(message, history, summary)
        mode_hint = pick_response_mode(PAD, clear_req, MOOD)
        if mode_hint:
            user_prompt += f"\n[本次：{mode_hint}]\n"
        try:
            base_sys = load_system_prompt()
            mood_ctx = build_mood_context(PAD, MOOD)
            composed_sys = base_sys + "\n\n" + mood_ctx if mood_ctx else base_sys
            reply = call_openai(composed_sys, user_prompt)
        except Exception as exc:
            return self._send_json(500, {"error": str(exc)})

        beat = pick_beat(action, PAD, clear_req)
        LAST_REPLY_TS = time.time()
        return self._send_json(200, {
            "action": action,
            "delay_ms": delay_ms,
            "reply": reply,
            "beat": beat,
            "state": STATE,
            "mood": round(MOOD, 2),
            "pad": PAD,
        })


if __name__ == "__main__":
    port = DEFAULT_PORT
    if len(os.sys.argv) > 1:
        try:
            port = int(os.sys.argv[1])
        except ValueError:
            raise SystemExit("端口必须是整数，例如：python server.py 9000")

    server = HTTPServer((HOST, port), Handler)
    print(f"Monday Chat running at http://{HOST}:{port}")
    server.serve_forever()
