import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectBookingEmbed } from './detect-embed';

describe('detectBookingEmbed', () => {
  it('detects reenio subdomain from widget config', () => {
    const html = `})({"url":"https:\\/\\/eterna.reenio.sk\\/sk\\/iframe","title":"x"});`;
    assert.deepEqual(detectBookingEmbed(html), {
      provider: 'reenio',
      subject: 'eterna',
    });
  });

  it('detects escaped widget script src', () => {
    const html = `"code":"<script src=\\"https:\\/\\/reenio.sk\\/sk\\/GY4DMMY\\/widget-iframe.js\\"></script>"`;
    const d = detectBookingEmbed(html);
    assert.equal(d?.provider, 'reenio');
    assert.equal(d && 'widgetCode' in d ? d.widgetCode : null, 'GY4DMMY');
  });

  it('returns null for plain pages', () => {
    assert.equal(detectBookingEmbed('<html><body>rozvrh hodín</body></html>'), null);
  });
});
