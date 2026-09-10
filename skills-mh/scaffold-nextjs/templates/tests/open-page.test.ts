import { describe, expect, it } from 'vitest';

import { parseBrowserOptions } from '../scripts/open-page';

describe('parseBrowserOptions', () => {
  it('uses the default viewport width', () => {
    expect(parseBrowserOptions(['http://localhost:3001'])).toEqual({
      url: 'http://localhost:3001',
      width: 1280,
      screenshot: undefined,
    });
  });

  it('accepts a screenshot path and viewport width', () => {
    expect(
      parseBrowserOptions([
        'http://localhost:3001/example',
        '--width',
        '768',
        '--screenshot=browser-output/example.png',
      ])
    ).toEqual({
      url: 'http://localhost:3001/example',
      width: 768,
      screenshot: 'browser-output/example.png',
    });
  });

  it.each([
    [[], 'a URL is required'],
    [['not-a-url'], 'invalid URL'],
    [['http://localhost', '--width', '0'], '--width must be'],
    [['http://localhost', '--wat'], 'unknown option'],
  ])('rejects invalid arguments', (args, message) => {
    expect(() => parseBrowserOptions(args)).toThrow(message);
  });
});
