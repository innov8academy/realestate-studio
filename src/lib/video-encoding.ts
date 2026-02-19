import type { VideoEncodingConfig } from 'mediabunny';

// Inlined constants from easy-peasy-ease
const DEFAULT_KEYFRAME_INTERVAL = 1.0;
const MAX_OUTPUT_FPS = 60;

// High profile Level 4.0 — works for up to 1080p
export const AVC_LEVEL_4_0 = 'avc1.640028';
// High profile Level 5.1 — works for above 1080p
export const AVC_LEVEL_5_1 = 'avc1.640033';

export const createAvcEncodingConfig = (
  bitrate: number,
  width?: number,
  height?: number,
  codecString: string = AVC_LEVEL_4_0,
  framerate?: number,
  useHardwareAcceleration: boolean = true
): VideoEncodingConfig => ({
  codec: 'avc',
  bitrate,
  keyFrameInterval: DEFAULT_KEYFRAME_INTERVAL,
  bitrateMode: 'variable',
  latencyMode: 'quality',
  fullCodecString: codecString,
  hardwareAcceleration: useHardwareAcceleration ? 'no-preference' : 'prefer-software',
  sizeChangeBehavior: 'contain',
  onEncoderConfig: (config) => {
    config.avc = { ...(config.avc ?? {}), format: 'avc' };
    if (!config.latencyMode) {
      config.latencyMode = 'quality';
    }
    if (framerate && framerate > 0) {
      config.framerate = framerate;
    } else if (!config.framerate) {
      config.framerate = MAX_OUTPUT_FPS;
    }
    config.bitrate = bitrate;
    if (width) config.width = width;
    if (height) config.height = height;
  },
});
