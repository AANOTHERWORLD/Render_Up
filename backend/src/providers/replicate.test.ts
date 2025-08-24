import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

import { runSDXLControlNetDepth, runDepthAnythingV2, replicate } from './replicate';

test('runSDXLControlNetDepth applies defaults when options undefined', async () => {
  const getMock = mock.method(
    replicate.models,
    'get',
    async () => ({ latest_version: { id: 'v1' } }) as any
  );
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
  const input = (runMock.mock.calls[0].arguments[1] as any).input as any;
  assert.equal(input.guidance_scale, 7);
  assert.equal(input.num_inference_steps, 30);
  assert.equal(input.controlnet_conditioning_scale, 1.0);
  runMock.mock.restore();
  getMock.mock.restore();
});

test('runDepthAnythingV2 returns URL string from FileOutput', async () => {
  const fake = { toString: () => 'https://example.com/out.png' } as any;
  const runMock = mock.method(
    replicate,
    'run',
    async (): Promise<any> => [fake]
  );

    const res = await runDepthAnythingV2('img');
    assert.equal(res, 'https://example.com/out.png');
    runMock.mock.restore();
  });

test('runSDXLControlNetDepth handles FileOutput image property', async () => {
  const fake = { toString: () => 'https://example.com/out.png' } as any;
  const getMock = mock.method(
    replicate.models,
    'get',
    async () => ({ latest_version: { id: 'v1' } }) as any
  );
  const runMock = mock.method(
    replicate,
    'run',
    async (): Promise<any> => ({ image: fake })
  );

  const res = await runSDXLControlNetDepth({
    image: 'img',
    control_image: 'ctrl',
    prompt: 'prompt'
  });

  assert.deepEqual(res, ['https://example.com/out.png']);
  runMock.mock.restore();
  getMock.mock.restore();
});

test('runSDXLControlNetDepth forwards width and height', async () => {
  const getMock = mock.method(
    replicate.models,
    'get',
    async () => ({ latest_version: { id: 'v1' } }) as any
  );
  const runMock = mock.method(
    replicate,
    'run',
    async (): Promise<any> => ['img']
  );

  await runSDXLControlNetDepth({
    image: 'img',
    control_image: 'ctrl',
    prompt: 'prompt',
    width: 512,
    height: 768,
  });

  const input = (runMock.mock.calls[0].arguments[1] as any).input as any;
  assert.equal(input.width, 512);
  assert.equal(input.height, 768);
  runMock.mock.restore();
  getMock.mock.restore();
});

