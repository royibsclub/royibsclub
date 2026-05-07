declare const CSInterface: new () => {
  evalScript: (script: string, callback?: (result: string) => void) => void;
};

let _csi: InstanceType<typeof CSInterface> | null = null;

function getCsi() {
  if (!_csi) {
    try {
      _csi = new CSInterface();
    } catch {
      return null;
    }
  }
  return _csi;
}

export function evalScript(script: string): Promise<string> {
  return new Promise((resolve) => {
    const csi = getCsi();
    if (!csi) {
      resolve('EvalScript Error: CSInterface not available');
      return;
    }
    csi.evalScript(script, (result) => resolve(result ?? ''));
  });
}

export function callFn(name: string, ...args: (string | number)[]): Promise<string> {
  const argStr = args
    .map((a) => (typeof a === 'string' ? `"${a.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : String(a)))
    .join(',');
  return evalScript(`${name}(${argStr})`);
}
