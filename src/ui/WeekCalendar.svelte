<script lang="ts">
  /**
   * WeekCalendar — Mon-Sun week view with per-day event list,
   * inline add form, and delete button per event.
   */
  import type { CalendarEvent, EventBus, Quest } from '@core/types';
  import type { CalendarService, QuestService } from '@core/services';
  import { CATEGORIES } from '@data/categories';
  import { onMount, onDestroy } from 'svelte';

  export let calendar: CalendarService;
  export let questService: QuestService;
  export let bus: EventBus;
  export let open = false;

  // Current week anchor (Monday of the displayed week)
  let weekStart = getMonday(new Date());
  let events: CalendarEvent[] = [];
  let openQuests: Quest[] = [];

  // Inline add form state
  let addingDay: string | null = null; // ISO date of the day being added to
  let newTitle = '';
  let newCategoryId: string = CATEGORIES[0]!.id;
  let newQuestId: string = '';

  // Bus unsubscribe
  let offCreated: (() => void) | undefined;
  let offUpdated: (() => void) | undefined;
  let offDeleted: (() => void) | undefined;

  onMount(async () => {
    // Re-refresh whenever any calendar event changes (from anywhere in the app)
    offCreated = bus.on('calendar:event:created', () => { void refresh(); });
    offUpdated = bus.on('calendar:event:updated', () => { void refresh(); });
    offDeleted = bus.on('calendar:event:deleted', () => { void refresh(); });
    await refresh();
    // Also load open quests for the "Link quest" select
    if (questService) {
      openQuests = await questService.listQuests('open');
    }
  });

  onDestroy(() => {
    offCreated?.();
    offUpdated?.();
    offDeleted?.();
  });

  async function refresh() {
    const from = formatLocalDate(weekStart);
    const to = formatLocalDate(addDays(weekStart, 6));
    events = await calendar.listRange(from, to);
  }

  function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    // getDay(): 0=Sun, 1=Mon, ... 6=Sat
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function addDays(d: Date, n: number): Date {
    const result = new Date(d);
    result.setDate(result.getDate() + n);
    return result;
  }

  function formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function weekDays(): { date: string; label: string; isToday: boolean }[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const date = formatLocalDate(d);
      const isToday = date === formatLocalDate(new Date());
      return { date, label: DAY_NAMES[i]!, isToday };
    });
  }

  function eventsForDay(date: string): CalendarEvent[] {
    return events.filter((e) => e.startsAt.startsWith(date));
  }

  function categoryColor(categoryId: string | null): string {
    if (!categoryId) return '#888';
    return CATEGORIES.find((c) => c.id === categoryId)?.color ?? '#888';
  }

  function prevWeek() {
    weekStart = addDays(weekStart, -7);
    refresh();
  }

  function nextWeek() {
    weekStart = addDays(weekStart, 7);
    refresh();
  }

  function goToday() {
    weekStart = getMonday(new Date());
    refresh();
  }

  function startAdd(date: string) {
    addingDay = date;
    newTitle = '';
    newCategoryId = CATEGORIES[0]!.id;
    newQuestId = '';
  }

  function cancelAdd() {
    addingDay = null;
  }

  async function submitAdd() {
    if (!addingDay || !newTitle.trim()) return;
    await calendar.addEvent({
      title: newTitle.trim(),
      date: addingDay,
      categoryId: newCategoryId || null,
      questId: newQuestId || undefined,
    });
    addingDay = null;
    await refresh();
  }

  async function deleteEvent(id: string) {
    await calendar.removeEvent(id);
    await refresh();
  }

  function close() {
    open = false;
  }

  // Week label, e.g. "Oct 6 – Oct 12"
  function weekLabel(): string {
    const from = weekStart;
    const to = addDays(weekStart, 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(from)} – ${fmt(to)}`;
  }
</script>

{#if open}
  <div class="overlay" on:click|self={close} on:keydown={(e) => { if (e.key === 'Escape') close(); }} tabindex="-1" role="dialog" aria-label="Week calendar">
    <div class="panel">
      <header>
        <h2>Calendar</h2>
        <button class="close" on:click={close} aria-label="Close calendar">✕</button>
      </header>

      <div class="week-nav">
        <button on:click={prevWeek} aria-label="Previous week">◀</button>
        <span class="week-label">{weekLabel()}</span>
        <button on:click={goToday}>Today</button>
        <button on:click={nextWeek} aria-label="Next week">▶</button>
      </div>

      <div class="week-grid">
        {#each weekDays() as day (day.date)}
          <div class="day-col" class:today={day.isToday}>
            <div class="day-header">
              <span class="day-name">{day.label}</span>
              <span class="day-num">{day.date.slice(8)}</span>
              <button class="add-btn" on:click={() => startAdd(day.date)} aria-label="Add event">+</button>
            </div>
            <ul class="event-list">
              {#each events.filter((e) => e.startsAt.startsWith(day.date)) as ev (ev.id)}
                <li>
                  <span class="dot" style="background: {categoryColor(ev.categoryId)}"></span>
                  <span class="ev-title">{ev.title}</span>
                  <button class="del-btn" on:click={() => deleteEvent(ev.id)} aria-label="Delete event">✕</button>
                </li>
              {/each}
            </ul>
            {#if addingDay === day.date}
              <form class="add-form" on:submit|preventDefault={submitAdd}>
                <input type="text" bind:value={newTitle} placeholder="Event title" />
                <select bind:value={newCategoryId}>
                  {#each CATEGORIES as cat (cat.id)}
                    <option value={cat.id}>{cat.name}</option>
                  {/each}
                  <option value="">None</option>
                </select>
                {#if openQuests.length > 0}
                  <select bind:value={newQuestId}>
                    <option value="">— Link quest —</option>
                    {#each openQuests as q (q.id)}
                      <option value={q.id}>{q.title}</option>
                    {/each}
                  </select>
                {/if}
                <div class="form-actions">
                  <button type="submit" disabled={!newTitle.trim()}>Add</button>
                  <button type="button" on:click={cancelAdd}>Cancel</button>
                </div>
              </form>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  .panel {
    background: #1e1e2e;
    border: 1px solid #444;
    border-radius: 12px;
    padding: 1.2rem;
    min-width: 640px;
    max-width: 95vw;
    max-height: 85vh;
    overflow-y: auto;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .close {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.2rem;
    cursor: pointer;
  }
  .week-nav {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.8rem;
  }
  .week-nav button {
    background: none;
    border: 1px solid #555;
    border-radius: 4px;
    color: inherit;
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .week-nav button:hover {
    border-color: #aaa;
  }
  .week-label {
    font-size: 0.95rem;
    min-width: 10rem;
    text-align: center;
  }
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.4rem;
  }
  .day-col {
    background: #252536;
    border-radius: 6px;
    padding: 0.4rem;
    min-height: 100px;
  }
  .day-col.today {
    border: 1px solid var(--accent, #ffd54f);
  }
  .day-header {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.3rem;
  }
  .day-name {
    font-size: 0.7rem;
    opacity: 0.7;
    text-transform: uppercase;
  }
  .day-num {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .add-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
  }
  .add-btn:hover {
    color: #ddd;
  }
  .event-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .event-list li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.15rem 0;
    font-size: 0.78rem;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .ev-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .del-btn {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    font-size: 0.7rem;
    padding: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .event-list li:hover .del-btn {
    opacity: 1;
  }
  .add-form {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 0.3rem;
  }
  .add-form input,
  .add-form select {
    background: #1a1c2c;
    border: 1px solid #555;
    border-radius: 4px;
    color: inherit;
    padding: 0.2rem 0.4rem;
    font-size: 0.78rem;
  }
  .form-actions {
    display: flex;
    gap: 0.3rem;
  }
  .form-actions button {
    background: none;
    border: 1px solid #555;
    border-radius: 4px;
    color: inherit;
    padding: 0.15rem 0.4rem;
    cursor: pointer;
    font-size: 0.75rem;
  }
  .form-actions button:hover:not(:disabled) {
    border-color: #aaa;
  }
  .form-actions button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
