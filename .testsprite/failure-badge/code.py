import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("https://statuspulse.edgeone.dev")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Click the 'See live demo →' link on the homepage to open the demo page and look for an embeddable SVG badge example.
        # See live demo → link
        elem = page.get_by_role('link', name='See live demo →', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Badge' button on the 'API Gateway' endpoint card to reveal the embeddable SVG badge URL.
        # API Gateway link
        elem = page.get_by_role('link', name='API Gateway', exact=True)
        await elem.click(timeout=10000)
        
        # -> Open the badge SVG URL https://statuspulse.edgeone.dev/endpoints/d66bbde2-d239-48ff-9064-25a24e171459/badge.svg and verify the returned SVG contains the text 'api gateway'.
        await page.goto("https://statuspulse.edgeone.dev/endpoints/d66bbde2-d239-48ff-9064-25a24e171459/badge.svg")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Badge SVG output contains the endpoint name 'api gateway'
        # Assert: Expected the badge SVG output to contain the endpoint name 'api gateway'.
        await expect(page.locator("xpath=/html/body/section").nth(0)).to_contain_text("api gateway", timeout=15000), "Expected the badge SVG output to contain the endpoint name 'api gateway'."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    