export interface GpuCapabilityReport {
  supported: boolean;
  message: string;
}

export const getWebGpuCapability = (): GpuCapabilityReport => {
  if (typeof navigator === 'undefined') {
    return { supported: false, message: 'Navigator is unavailable in this environment.' };
  }

  if (!navigator.gpu) {
    return {
      supported: false,
      message: 'WebGPU is not exposed by this browser, so WebGL fallback is active.',
    };
  }

  return {
    supported: true,
    message: 'WebGPU is available. PhysicsLab AI will try the WebGPU renderer first.',
  };
};
