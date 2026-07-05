/**
 * StatusPulse Submission Demo Recorder
 *
 * Generates a clean 45-second demo video for hackathon submission.
 *
 * Usage:
 *   npm run demo
 *
 * Output:
 *   assets/demo-submission.webm — Clean 1440×900 video
 *   assets/demo-*.png            — Screenshots at key steps
 */

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const TARGET = process.env.DEMO_URL || 'https://statuspulse.edgeone.dev'
const OUTPUT = path.resolve(__dirname, '..', 'assets')

// Natural pause between steps
const PAUSE = 800

async function typeNaturally(frame, selector, text) {
  const el = await frame.waitForSelector(selector, { timeout: 10000 })
  await el.click()
  // Type character by character for natural look
  for (const char of text) {
    await frame.type(selector, char, { delay: 40 + Math.random() * 30 })
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true })

  console.log('🎥 StatusPulse Submission Demo\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: OUTPUT, size: { width: 1440, height: 900 } },
  })

  const page = await context.newPage()

  try {
    // ─── Warm-up: trigger EdgeOne cold start before recording ────────────
    console.log('0/5 Warming up...')
    await page.goto(`${TARGET}/api/health`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1000)
    console.log('   ✓ EdgeOne warm\n')

    // ─── 0:00–0:05 ─ Show dashboard ─────────────────────────────────────
    console.log('1/5 Dashboard...')
    await page.goto(`${TARGET}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000) // Let dashboard fully render
    await page.screenshot({ path: path.join(OUTPUT, 'demo-01-dashboard.png') })
    console.log('   ✓ Dashboard captured')

    // ─── 0:05–0:10 ─ Open AI Chat ───────────────────────────────────────
    console.log('2/5 AI Chat...')
    await page.waitForSelector('#__aa-bubble', { timeout: 15000 })
    await page.waitForTimeout(PAUSE)
    await page.click('#__aa-bubble')
    await page.waitForTimeout(2000) // Let widget fully load
    await page.screenshot({ path: path.join(OUTPUT, 'demo-02-ai-opened.png') })
    console.log('   ✓ AI chat opened')

    // ─── 0:10–0:20 ─ Type question ──────────────────────────────────────
    console.log('3/5 Typing...')
    const frameElement = await page.waitForSelector('#__aa-frame.open', { timeout: 10000 })
    const frame = await frameElement.contentFrame()
    if (!frame) throw new Error('Could not access widget iframe')

    await typeNaturally(frame, 'textarea[aria-label="Chat message input"]', 'Which APIs are currently down?')
    await page.waitForTimeout(PAUSE)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-03-question-typed.png') })
    console.log('   ✓ Question typed naturally')

    // ─── 0:20–0:35 ─ Send + AI responds ─────────────────────────────────
    console.log('4/5 AI responding...')
    await frame.click('button[aria-label="Send message"]')
    await page.waitForTimeout(12000) // AI streams response (tool calls + text)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-04-ai-responded.png') })
    console.log('   ✓ AI responded')

    // ─── 0:35–0:45 ─ Full response visible ───────────────────────────────
    console.log('5/5 Final...')
    await page.waitForTimeout(5000)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-05-final.png') })
    console.log('   ✓ Complete')

    // Save final screenshot
    await page.screenshot({ path: path.join(OUTPUT, 'demo-06-final.png') })

    console.log(`\n✅ Demo video saved to: ${path.join(OUTPUT, 'demo-submission.webm')}`)
    console.log('   Ready for hackathon submission.')

  } catch (err) {
    console.error('❌ Failed:', err.message)
    await page.screenshot({ path: path.join(OUTPUT, 'demo-error.png') })
    process.exit(1)
  } finally {
    // Close context to finalize video recording
    await context.close()
    
    // Rename Playwright auto-generated video to predictable name
    const videoFiles = fs.readdirSync(OUTPUT).filter(f => f.startsWith('page@') && f.endsWith('.webm'))
    if (videoFiles.length > 0) {
      const latestVideo = videoFiles.sort().pop()
      const oldPath = path.join(OUTPUT, latestVideo)
      const newPath = path.join(OUTPUT, 'demo-submission.webm')
      fs.renameSync(oldPath, newPath)
      console.log(`\n✅ Video renamed: ${newPath}`)
    }
    
    await browser.close()
  }
}

main()
