import type { AppEventMap, AppEventName, AppEventHandler, EventBus } from './types';

/** Typed event bus. `game` and `ui` talk to `core` ONLY through this. */
export function createEventBus(): EventBus {
  const listeners = new Map<string, Set<AppEventHandler<never>>>();

  return {
    on<N extends AppEventName>(name: N, handler: AppEventHandler<N>): () => void {
      let set = listeners.get(name);
      if (!set) {
        set = new Set();
        listeners.set(name, set);
      }
      set.add(handler as AppEventHandler<never>);
      return () => this.off(name, handler);
    },
    off<N extends AppEventName>(name: N, handler: AppEventHandler<N>): void {
      listeners.get(name)?.delete(handler as AppEventHandler<never>);
    },
    emit<N extends AppEventName>(name: N, payload: AppEventMap[N]): void {
      for (const handler of listeners.get(name) ?? []) {
        try {
          (handler as unknown as AppEventHandler<N>)(payload);
        } catch (err) {
          console.error(`[eventBus] handler for "${name}" threw`, err);
        }
      }
    },
  };
}
