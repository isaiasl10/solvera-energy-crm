export function sanitizePatch<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: any = {};
  Object.keys(obj).forEach((k) => {
    const v = (obj as any)[k];
    if (v !== undefined) {
      clean[k] = v;
    }
  });
  return clean as Partial<T>;
}
