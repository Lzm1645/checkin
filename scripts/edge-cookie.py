"""从 Microsoft Edge 的 Cookies 数据库解出 glados.rocks 的 koa:sess cookie。

macOS Chromium 的 cookie 用 Keychain 里的 "Microsoft Edge Safe Storage" 派生
AES-128-CBC 密钥；新版还会在明文前加 32 字节 sha256(host) 前缀，这里一并处理。
输出可直接作为 cookie 头使用。
"""
import base64
import hashlib
import os
import shutil
import sqlite3
import subprocess
import tempfile

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

EDGE_CANDIDATES = [
    os.path.expanduser("~/Library/Application Support/Microsoft Edge/Default/Network/Cookies"),
    os.path.expanduser("~/Library/Application Support/Microsoft Edge/Default/Cookies"),
]
EDGE = next((path for path in EDGE_CANDIDATES if os.path.exists(path)), EDGE_CANDIDATES[0])
HOST = "glados.rocks"


def key() -> bytes:
    material = subprocess.run(
        ["security", "find-generic-password", "-w", "-s", "Microsoft Edge Safe Storage"],
        capture_output=True, text=True, check=True,
    ).stdout.strip().encode()
    return hashlib.pbkdf2_hmac("sha1", material, b"saltysalt", 1003, 16)


def decrypt(enc: bytes, k: bytes) -> str:
    data = enc[3:] if enc[:3] in (b"v10", b"v11") else enc
    dec = Cipher(algorithms.AES(k), modes.CBC(b" " * 16)).decryptor()
    raw = dec.update(data) + dec.finalize()
    raw = raw[: -raw[-1]]
    prefix = hashlib.sha256(HOST.encode()).digest()[:32]
    if raw[:32] == prefix:
        raw = raw[32:]
    return raw.decode("utf-8", "replace")


def main() -> int:
    if not os.path.exists(EDGE):
        print("找不到 Edge 的 Cookies 数据库", file=os.sys.stderr)
        return 1
    tmp = tempfile.mktemp(suffix=".db")
    shutil.copy2(EDGE, tmp)
    con = sqlite3.connect(tmp)
    k = key()
    pairs = {}
    for name, enc in con.execute(
        "select name, encrypted_value from cookies where host_key=?", (HOST,)
    ):
        try:
            pairs[name] = decrypt(bytes(enc), k)
        except Exception:
            continue
    con.close()
    os.unlink(tmp)
    if "koa:sess" not in pairs:
        print("Edge 里没有 glados.rocks 的会话（需要先登录）", file=os.sys.stderr)
        return 2
    print("; ".join(f"{name}={value}" for name, value in pairs.items()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
