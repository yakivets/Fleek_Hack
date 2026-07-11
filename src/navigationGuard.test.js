import test from 'node:test';
import assert from 'node:assert/strict';

import { changeScreenUnlessSharing } from './navigationGuard.js';

test('guards screen changes while an eBay share is active', () => {
  const screens = [];

  assert.equal(changeScreenUnlessSharing(true, (screen) => screens.push(screen), 'home'), false);
  assert.deepEqual(screens, []);

  assert.equal(
    changeScreenUnlessSharing(false, (screen) => screens.push(screen), 'capture'),
    true,
  );
  assert.deepEqual(screens, ['capture']);
});
