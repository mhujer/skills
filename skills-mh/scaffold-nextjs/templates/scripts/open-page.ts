import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium } from 'playwright-core';

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;

export interface BrowserOptions {
  url: string;
  width: number;
  screenshot?: string;
}

function optionValue(args: string[], index: number, name: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

export function parseBrowserOptions(args: string[]): BrowserOptions {
  let url: string | undefined;
  let width = DEFAULT_WIDTH;
  let screenshot: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--width') {
      width = Number(optionValue(args, index, '--width'));
      index += 1;
    } else if (argument.startsWith('--width=')) {
      width = Number(argument.slice('--width='.length));
    } else if (argument === '--screenshot') {
      screenshot = optionValue(args, index, '--screenshot');
      index += 1;
    } else if (argument.startsWith('--screenshot=')) {
      screenshot = argument.slice('--screenshot='.length);
    } else if (argument.startsWith('--')) {
      throw new Error(`unknown option: ${argument}`);
    } else if (url === undefined) {
      url = argument;
    } else {
      throw new Error(`unexpected argument: ${argument}`);
    }
  }

  if (url === undefined) {
    throw new Error('a URL is required');
  }
  if (!Number.isInteger(width) || width <= 0 || width > 10_000) {
    throw new Error('--width must be an integer from 1 to 10000');
  }

  try {
    new URL(url);
  } catch {
    throw new Error(`invalid URL: ${url}`);
  }

  return { url, width, screenshot };
}

export async function openPage(options: BrowserOptions): Promise<void> {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: options.width, height: DEFAULT_HEIGHT },
    });

    page.on('console', (message) => {
      console.log(`[console:${message.type()}] ${message.text()}`);
    });
    page.on('pageerror', (error) => {
      console.error(`[pageerror] ${error.stack ?? error.message}`);
    });

    const response = await page.goto(options.url, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    if (options.screenshot !== undefined) {
      const screenshotPath = resolve(options.screenshot);
      await mkdir(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.error(`Screenshot saved to ${screenshotPath}`);
    }

    if (response !== null && !response.ok()) {
      throw new Error(`page responded with HTTP ${response.status()}`);
    }
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  try {
    await openPage(parseBrowserOptions(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
