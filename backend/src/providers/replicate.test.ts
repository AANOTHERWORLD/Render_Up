import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { runSDXLControlNetDepth, replicate } from './replicate.ts';

test('runSDXLControlNetDepth applies defaults when options undefined', async () => {
  const runMock = mock.method(
    replicate,
    'run',
    async (
      _model: Parameters<typeof replicate.run>[0],
      opts: Parameters<typeof replicate.run>[1]
    ): Promise<object> => {
      return ['img'] as unknown as object;
    }
  );

  const res = await runSDXLControlNetDepth({
    image: 'img',
    control_image: 'ctrl',
    prompt: 'prompt',
    guidance_scale: undefined,
  });

  assert.deepEqual(res, ['img']);
  assert.equal(runMock.mock.calls.length, 1);
  const input = runMock.mock.calls[0].arguments[1].input;
  assert.equal(input.guidance_scale, 7);
  assert.equal(input.num_inference_steps, 30);
  assert.equal(input.controlnet_conditioning_scale, 1.0);
  runMock.mock.restore();
});

