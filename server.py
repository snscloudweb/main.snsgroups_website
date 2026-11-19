#!/usr/bin/env python3
"""
Local Development Server for SNS Groups (_public_html)
Serves static files AND handles /api/whatsapp-otp.php locally (mirroring Hostinger PHP runtime)
using the root .env file and PayPerWA API.
"""

import hashlib
import hmac
import http.server
import json
import os
import random
import re
import socket
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
OTP_STORE = {}


def load_env():
    env_path = ROOT_DIR / ".env"
    env = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("\"'")
    return env


def normalize_phone(raw_phone: str) -> str:
    digits = re.sub(r"\D+", "", str(raw_phone or ""))
    if len(digits) == 10:
        return "91" + digits
    if len(digits) == 11 and digits.startswith("0"):
        return "91" + digits[1:]
    return digits


def send_payperwa_message(base_url: str, api_key: str, to: str, template_name: str, variables: list):
    url = base_url.rstrip("/") + "/messages/send"
    payload = {
        "to": to,
        "template_name": template_name,
        "language": "en",
        "variables": [str(v) for v in variables],
    }
    print(f"[PayPerWA Request] to={to} template={template_name} variables={variables}", flush=True)
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "SNS-Enquiry-Server/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            print(f"[PayPerWA Response] status={resp.status} body={parsed}", flush=True)
            return {"ok": 200 <= resp.status < 300, "status": resp.status, "response": parsed}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        print(f"[PayPerWA HTTPError] status={e.code} body={parsed}", flush=True)
        return {"ok": False, "status": e.code, "response": parsed}
    except Exception as e:
        print(f"[PayPerWA Error] {e}", flush=True)
        return {"ok": False, "status": 500, "response": {"error": str(e)}}


class SNSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def _send_json(self, status_code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        clean_path = self.path.split("?")[0]
        if clean_path not in ("/api/whatsapp-otp.php", "/api/whatsapp-otp"):
            self._send_json(404, {"success": False, "message": "Endpoint not found"})
            return

        content_len = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_len).decode("utf-8", errors="replace") if content_len > 0 else "{}"
        try:
            data = json.loads(raw_body)
        except Exception:
            data = {}

        env = load_env()
        api_key = env.get("PAYPERWA_API_KEY", "")
        base_url = env.get("PAYPERWA_BASE_URL", "https://payperwa.com/api/v1")
        otp_template = env.get("PAYPERWA_OTP_TEMPLATE", "snsgroups_adm_otp")
        welcome_template = env.get("PAYPERWA_WELCOME_TEMPLATE", "snsgroups_welcome_msg")
        expiry_minutes = int(env.get("OTP_EXPIRY_MINUTES", "10"))
        secret_key = env.get("OTP_SECRET_KEY", "sns_institutions_otp_secret_2026")

        if not api_key:
            self._send_json(500, {"success": False, "message": "Missing PAYPERWA_API_KEY in .env"})
            return

        action = str(data.get("action", "")).strip()
        raw_phone = str(data.get("phone", "")).strip()
        name = str(data.get("name", "")).strip()
        phone = normalize_phone(raw_phone)

        if not re.match(r"^91[6-9]\d{9}$", phone):
            self._send_json(400, {"success": False, "message": "Please enter a valid 10-digit WhatsApp mobile number."})
            return

        now = int(time.time())

        # 1. SEND OTP
        if action == "send_otp":
            otp = str(random.randint(100000, 999999))
            expires_at = now + (expiry_minutes * 60)
            OTP_STORE[phone] = {
                "otp": otp,
                "expires_at": expires_at,
                "verified": False,
                "name": name,
            }
            sig = hmac.new(secret_key.encode(), f"{phone}|{otp}|{expires_at}".encode(), hashlib.sha256).hexdigest()
            token = f"{expires_at}.{sig}"

            result = send_payperwa_message(base_url, api_key, phone, otp_template, [otp])
            if not result["ok"]:
                resp_obj = result.get("response")
                err_msg = (
                    resp_obj.get("message") or resp_obj.get("error")
                    if isinstance(resp_obj, dict)
                    else "Failed to send WhatsApp OTP."
                )
                self._send_json(502, {"success": False, "message": err_msg, "details": resp_obj})
                return

            self._send_json(
                200,
                {
                    "success": True,
                    "message": f"OTP sent to your WhatsApp number! Valid for {expiry_minutes} minutes.",
                    "token": token,
                    "expires_in": expiry_minutes * 60,
                },
            )
            return

        # 2. VERIFY OTP (Only verifies OTP, does NOT send verification_message yet)
        if action == "verify_otp":
            entered_otp = re.sub(r"\D+", "", str(data.get("otp", "")))
            token = str(data.get("token", "")).strip()

            if len(entered_otp) != 6:
                self._send_json(400, {"success": False, "message": "Please enter the 6-digit OTP received on WhatsApp."})
                return

            is_verified = False
            is_expired = False

            record = OTP_STORE.get(phone)
            if record:
                if now > record["expires_at"]:
                    is_expired = True
                    OTP_STORE.pop(phone, None)
                elif record["otp"] == entered_otp:
                    is_verified = True
                    record["verified"] = True
                    record["expires_at"] = now + 1800
                    if name:
                        record["name"] = name

            if not is_verified and not is_expired and "." in token:
                exp_str, sig_part = token.split(".", 1)
                try:
                    exp_time = int(exp_str)
                    if now > exp_time:
                        is_expired = True
                    else:
                        expected_sig = hmac.new(
                            secret_key.encode(), f"{phone}|{entered_otp}|{exp_time}".encode(), hashlib.sha256
                        ).hexdigest()
                        if hmac.compare_digest(expected_sig, sig_part):
                            is_verified = True
                except ValueError:
                    pass

            if is_expired:
                self._send_json(
                    400,
                    {"success": False, "message": "This OTP has expired (10 minutes limit). Please request a new OTP."},
                )
                return

            if not is_verified:
                self._send_json(
                    400, {"success": False, "message": "Invalid OTP. Please check the code sent to your WhatsApp."}
                )
                return

            verified_exp = now + 1800
            verified_sig = hmac.new(
                secret_key.encode(), f"VERIFIED|{phone}|{verified_exp}".encode(), hashlib.sha256
            ).hexdigest()
            verified_token = f"{verified_exp}.{verified_sig}"

            self._send_json(
                200,
                {
                    "success": True,
                    "verified": True,
                    "verified_token": verified_token,
                    "message": "WhatsApp OTP verified successfully!",
                },
            )
            return

        # 3. SEND CONFIRMATION (Triggered ONLY when clicking APPLY NOW!)
        if action == "send_confirmation":
            verified_token = str(data.get("verified_token", "")).strip()
            authorized = False

            record = OTP_STORE.get(phone)
            if record and record.get("verified"):
                authorized = True
                if not name and record.get("name"):
                    name = record["name"]
                OTP_STORE.pop(phone, None)

            if not authorized and "." in verified_token:
                exp_str, sig_part = verified_token.split(".", 1)
                try:
                    exp_time = int(exp_str)
                    if now <= exp_time:
                        expected_sig = hmac.new(
                            secret_key.encode(), f"VERIFIED|{phone}|{exp_time}".encode(), hashlib.sha256
                        ).hexdigest()
                        if hmac.compare_digest(expected_sig, sig_part):
                            authorized = True
                except ValueError:
                    pass

            if not authorized:
                self._send_json(
                    400, {"success": False, "message": "Phone number is not verified. Please verify your WhatsApp OTP first."}
                )
                return

            recipient_name = name if name else "Student"
            welcome_res = send_payperwa_message(base_url, api_key, phone, welcome_template, [recipient_name])

            self._send_json(
                200,
                {
                    "success": True,
                    "confirmation_sent": welcome_res["ok"],
                    "message": "Enquiry confirmation message sent on WhatsApp!",
                    "confirmation_details": welcome_res["response"],
                },
            )
            return

        self._send_json(400, {"success": False, "message": "Invalid action."})


if __name__ == "__main__":
    os.chdir(ROOT_DIR)
    port = 8000

    class DualStackServer(http.server.ThreadingHTTPServer):
        address_family = socket.AF_INET6

        def server_bind(self):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            return super().server_bind()

    with DualStackServer(("::", port), SNSRequestHandler) as httpd:
        print(f"Serving SNS Groups site + WhatsApp OTP API at http://localhost:{port}", flush=True)
        httpd.serve_forever()
