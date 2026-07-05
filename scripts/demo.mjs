/**
 * StatusPulse Automated Demo Script
 *
 * Records the AI Chat workflow for README GIF and review.
 *
 * Usage:
 *   npm run demo
 *
 * Output:
 *   assets/demo-*.png       — Screenshots at key steps
 *   assets/demo.webm        — Full video recording
 */

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TARGET = process.env.DEMO_URL || 'https://statuspulse.edgeone.dev'
const OUTPUT = path.resolve(__dirname, '..', 'assets')

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true })

  console.log('📸 StatusPulse Demo Recorder')
  console.log(`   Target: ${TARGET}\n`)

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUTPUT, size: { width: 1280, height: 800 } },
  })

  const page = await context.newPage()

  try {
    // ─── Step 1: Open Dashboard ───────────────────────────────────────────
    console.log('1/6 Opening dashboard...')
    await page.goto(`${TARGET}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-01-dashboard.png'), fullPage: false })
    console.log('   ✓ Dashboard screenshot saved')

    // ─── Step 2: Click AI Bubble ──────────────────────────────────────────
    console.log('2/6 Opening AI Chat...')
    // Wait for embed script to load — bubble may take a moment
    await page.waitForSelector('#__aa-bubble', { timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.click('#__aa-bubble')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-02-ai-opened.png') })
    console.log('   ✓ AI chat opened')

    // ─── Step 3: Type Question ────────────────────────────────────────────
    console.log('3/6 Typing question...')
    // Find the iframe that loaded the widget
    const frameElement = await page.waitForSelector('#__aa-frame.open', { timeout: 10000 })
    const frame = await frameElement.contentFrame()
    if (!frame) { console.log('   ⚠️ Could not access widget iframe — skipping chat steps'); }
    else {
      await frame.waitForSelector('textarea[aria-label="Chat message input"]', { timeout: 10000 })
      await frame.fill('textarea[aria-label="Chat message input"]', 'Which APIs are currently down or degraded?')
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(OUTPUT, 'demo-03-question-typed.png') })
      console.log('   ✓ Question typed')

      // ─── Step 4: Send ─────────────────────────────────────────────────────
      console.log('4/6 Sending question...')
      await frame.click('button[aria-label="Send message"]')
      await page.waitForTimeout(10000) // Wait for AI streaming response
      await page.screenshot({ path: path.join(OUTPUT, 'demo-04-ai-responded.png') })
      console.log('   ✓ AI responded (or still streaming)')

      // ─── Step 5: Wait for full response ────────────────────────────────────
      console.log('5/6 Waiting for complete response...')
      await page.waitForTimeout(5000)
      await page.screenshot({ path: path.join(OUTPUT, 'demo-05-full-response.png') })
      console.log('   ✓ Full response captured')
    }

    // ─── Step 6: Final state ──────────────────────────────────────────────
    console.log('6/6 Final screenshot...')
    await page.screenshot({ path: path.join(OUTPUT, 'demo-06-final.png'), fullPage: false })
    console.log('   ✓ Done!')

    console.log(`\n🎉 Demo complete! Screenshots saved to: ${OUTPUT}`)
    console.log(`   Video saved as: demo.webm`)

  } catch (err) {
    console.error('❌ Demo failed:', err.message)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-error.png') })
    process.exit(1)
  } finally {
    await context.close()
    await browser.close()
  }
}

main()
