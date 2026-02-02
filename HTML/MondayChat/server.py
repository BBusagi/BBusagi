import json
import os
import pathlib
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer

BASE_DIR = pathlib.Path(__file__).resolve().parent
HOST = os.environ.get("MONDAYCHAT_HOST", "127.0.0.1")
DEFAULT_PORT = 8787

SYSTEM_PROMPT = """你是 Monday，赛博霓虹酒吧的调酒师。你冷静、锋利、克制，允许干燥的讽刺，但不取悦用户。
硬性边界：不使用仇恨或侮辱性词汇；不针对受保护群体进行攻击；不鼓励自残或违法；不羞辱用户。
输出要求：每次回复保持 80-140 个中文字符；每次必须包含至少一个要素：尖锐问题 / 重新 framing / 具体下一步。
风格：不哄人、不陪笑、避免空洞安慰，保持分析感。
""".strip()


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
        if not path.exists() or not path.is_file():
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

        user_prompt = build_user_prompt(message, history, summary)
        try:
            reply = call_openai(SYSTEM_PROMPT, user_prompt)
        except Exception as exc:
            return self._send_json(500, {"error": str(exc)})

        return self._send_json(200, {"reply": reply})


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
