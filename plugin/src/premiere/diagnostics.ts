import { evalScript, callFn } from './bridge';

export interface DiagResult {
  ok: boolean;
  value: string;
}

export async function testCSInterface(): Promise<DiagResult> {
  const available = typeof (window as Window & { CSInterface?: unknown }).CSInterface !== 'undefined';
  return { ok: available, value: available ? 'available' : 'undefined' };
}

export async function testAppAvailable(): Promise<DiagResult> {
  const r = await evalScript('typeof app');
  return { ok: r === 'object', value: r };
}

export async function testProjectName(): Promise<DiagResult> {
  const r = await callFn('getProjectName');
  const ok = !r.startsWith('EvalScript Error') && !r.startsWith('error');
  return { ok, value: r };
}

export async function testSequenceName(): Promise<DiagResult> {
  const r = await callFn('getSequenceName');
  const ok = !r.startsWith('EvalScript Error') && !r.startsWith('error');
  return { ok, value: r };
}

export async function testPlayheadTime(): Promise<DiagResult> {
  const r = await callFn('getPlayheadTime');
  const num = parseFloat(r);
  const ok = !isNaN(num) && num >= 0;
  return { ok, value: r };
}

export async function testVideoTrackCount(): Promise<DiagResult> {
  const r = await callFn('getVideoTrackCount');
  const ok = !r.startsWith('error') && parseInt(r) > 0;
  return { ok, value: r };
}

export async function testV1ClipCount(): Promise<DiagResult> {
  const r = await callFn('getV1ClipCount');
  const ok = !r.startsWith('error') && parseInt(r) > 0;
  return { ok, value: r };
}

export async function testQEDOM(): Promise<DiagResult> {
  const r = await callFn('testQEDOM');
  return { ok: r === 'ok', value: r };
}

export async function testServerHealth(): Promise<DiagResult> {
  try {
    const res = await fetch('http://localhost:3333/health');
    const ok = res.ok;
    return { ok, value: ok ? 'ok' : `${res.status}` };
  } catch {
    return { ok: false, value: 'unreachable' };
  }
}

export async function runAddMarker(label: string): Promise<DiagResult> {
  const r = await callFn('addMarkerAtPlayhead', label);
  const ok = r.startsWith('ok:');
  return { ok, value: r };
}

export async function runSetScale(scale: number): Promise<DiagResult> {
  const r = await callFn('setClipScaleAtPlayhead', scale);
  const ok = r.startsWith('ok:');
  return { ok, value: r };
}

export async function runZoomPunch(scale: number): Promise<DiagResult> {
  const r = await callFn('addZoomPunchAtPlayhead', scale);
  const ok = r.startsWith('ok:');
  return { ok, value: r };
}
