import { describe, it, expect } from 'vitest';
import { createEventBus } from '../../src/core/eventBus';

describe('eventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = createEventBus();
    const seen: string[] = [];
    bus.on('quest:created', ({ quest }) => seen.push(quest.title));
    bus.emit('quest:created', { quest: { title: 'A', } as never });
    expect(seen).toEqual(['A']);
  });

  it('unsubscribe stops delivery', () => {
    const bus = createEventBus();
    const seen: string[] = [];
    const off = bus.on('quest:completed', () => seen.push('x'));
    off();
    bus.emit('quest:completed', { quest: {} as never, xpGained: 0 });
    expect(seen).toEqual([]);
  });

  it('a throwing handler does not break other handlers', () => {
    const bus = createEventBus();
    const seen: string[] = [];
    bus.on('skill:levelup', () => {
      throw new Error('boom');
    });
    bus.on('skill:levelup', ({ skill }) => seen.push(skill.name));
    bus.emit('skill:levelup', { skill: { name: 'Fitness' } as never, newLevel: 2 });
    expect(seen).toEqual(['Fitness']);
  });
});
