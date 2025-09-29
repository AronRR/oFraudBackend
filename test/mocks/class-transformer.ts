export type ClassConstructor<T> = new (...args: any[]) => T;

const createMetadataMap = () => new Map<any, Map<any, any>>();

export const defaultMetadataStorage = {
  _excludeMetadatas: createMetadataMap(),
  _exposeMetadatas: createMetadataMap(),
  _transformMetadatas: createMetadataMap(),
  _typeMetadatas: createMetadataMap(),
};

export function plainToInstance<T, V>(cls: ClassConstructor<T>, plain: V, _options?: unknown): T {
  if (!cls || typeof cls !== 'function') {
    return plain as unknown as T;
  }

  const instance = new cls();
  const source = plain as Record<string, unknown>;

  Object.keys(source).forEach((key) => {
    const value = source[key];
    const current = (instance as Record<string, unknown>)[key];

    if (typeof current === 'number' && typeof value === 'string') {
      const parsed = Number(value);
      (instance as Record<string, unknown>)[key] = Number.isNaN(parsed) ? current : parsed;
      return;
    }

    (instance as Record<string, unknown>)[key] = value;
  });

  return instance;
}

export const plainToClass = plainToInstance;

export function instanceToPlain<T>(_instance: T, _options?: unknown): T {
  return _instance;
}

export const classToPlain = instanceToPlain;

export function Expose(): PropertyDecorator {
  return () => undefined;
}

export function Exclude(): PropertyDecorator {
  return () => undefined;
}

export function Transform(): PropertyDecorator {
  return () => undefined;
}

export function Type(): PropertyDecorator {
  return () => undefined;
}
