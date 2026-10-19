import { drawScene } from './render';

// Renders at the device's native pixel size, so the PNG keeps full source quality.
export function renderPng(device, img, items) {
  const canvas = Object.assign(document.createElement('canvas'), { width: device.w, height: device.h });
  drawScene(canvas.getContext('2d'), device.w, device.h, img, items, new Date());
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
