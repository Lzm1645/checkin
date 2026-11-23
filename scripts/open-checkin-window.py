"""打开已登录的 Edge 配置，停在签到弹窗，等用户点一次 Cloudflare 人机验证。

GLaDOS 的签到要求 Turnstile 人机验证，自动化无法通过；这个脚本只负责把
「签到」按钮点开，剩下的验证由人来点。窗口保持 10 分钟。
"""
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright


async def main() -> None:
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            str(Path.home() / ".config/glados/browser-edge"),
            headless=False,
            channel="msedge",
            args=["--start-maximized"],
            no_viewport=True,
        )
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await page.goto("https://glados.rocks/console", wait_until="networkidle", timeout=60000)
        await page.wait_for_timeout(2000)
        try:
            await page.click("text=Points")
            await page.wait_for_timeout(1500)
            await page.locator("button", has_text="Checkin").first.click()
            print("签到弹窗已打开，请点一次「验证您是真人」")
        except Exception as error:  # noqa: BLE001
            print(f"打开签到失败：{error}")
        await page.wait_for_timeout(10 * 60 * 1000)
        await ctx.close()


asyncio.run(main())
