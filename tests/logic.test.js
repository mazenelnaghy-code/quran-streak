import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appDay, addDays, daysBetween, dayEndsAt, readDays, lastDays, streaks, sharedDays,
  nextMilestone, milestoneProgress, khatma, dailyPick,
} from '../js/logic.js';
import { arCount } from '../js/i18n.js';

const days = (...list) => Object.fromEntries(list.map((d) => [d, 0]));

test('a reading day starts at 3 AM, so late-night reading counts for the evening before', () => {
  assert.equal(appDay(new Date(2026, 10, 2, 2, 59)), '2026-11-01');
  assert.equal(appDay(new Date(2026, 10, 2, 3, 0)), '2026-11-02');
  assert.equal(appDay(new Date(2026, 10, 2, 23, 30)), '2026-11-02');
});

test('day maths crosses months and years', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
  assert.equal(daysBetween('2026-10-30', '2026-11-02'), 3);
  assert.deepEqual(lastDays('2026-11-02', 3), ['2026-10-31', '2026-11-01', '2026-11-02']);
});

test('the day ends at 3 AM the next morning', () => {
  const end = dayEndsAt('2026-11-02');
  assert.equal(end.getDate(), 3);
  assert.equal(end.getHours(), 3);
});

test('readDays ignores bad keys and days after today', () => {
  assert.deepEqual(readDays({ '2026-11-01': 0, oops: 1, '2026-11-09': 0 }, '2026-11-02'), ['2026-11-01']);
});

test('a streak that reached yesterday is still alive before you read today', () => {
  const list = readDays(days('2026-10-30', '2026-10-31', '2026-11-01'), '2026-11-02');
  const s = streaks(list, '2026-11-02');
  assert.equal(s.current, 3);
  assert.equal(s.readToday, false);
});

test('reading today extends the streak', () => {
  const s = streaks(['2026-10-31', '2026-11-01', '2026-11-02'], '2026-11-02');
  assert.equal(s.current, 3);
  assert.equal(s.readToday, true);
});

test('a missed day breaks the current streak but not the best one', () => {
  const s = streaks(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-31', '2026-11-02'], '2026-11-02');
  assert.equal(s.current, 1);
  assert.equal(s.best, 4);
  assert.equal(s.total, 6);
  assert.equal(streaks(['2026-10-30'], '2026-11-02').current, 0);
});

test('the shared streak counts days everyone read', () => {
  const a = ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];
  const b = ['2026-10-31', '2026-11-01', '2026-11-02'];
  const c = ['2026-11-01', '2026-11-02'];
  assert.deepEqual(sharedDays([a, b]), b);
  assert.equal(streaks(sharedDays([a, b, c]), '2026-11-02').current, 2);
  assert.deepEqual(sharedDays([]), []);
});

test('milestones and the ring towards the next one', () => {
  assert.equal(nextMilestone(0), 3);
  assert.equal(nextMilestone(7), 14);
  assert.equal(nextMilestone(400), null);
  assert.equal(milestoneProgress(0), 0);
  assert.equal(milestoneProgress(5), 0.5);
  assert.equal(milestoneProgress(400), 1);
});

test('pages add up to khatmas of 604 pages', () => {
  assert.deepEqual(khatma({ a: 600, b: 10, c: 0 }), { total: 610, done: 1, pages: 6 });
  assert.deepEqual(khatma({}), { total: 0, done: 0, pages: 0 });
});

test('the daily reminder changes every day and is the same for everyone', () => {
  const list = ['a', 'b', 'c'];
  assert.equal(dailyPick(list, '2026-11-02'), dailyPick(list, '2026-11-02'));
  assert.notEqual(dailyPick(list, '2026-11-02'), dailyPick(list, '2026-11-03'));
});

test('Arabic counted nouns', () => {
  const day = (n) => arCount(n, 'يوم', 'يومان', 'أيام', 'يومًا');
  assert.equal(day(1), 'يوم');
  assert.equal(day(2), 'يومان');
  assert.equal(day(3), 'أيام');
  assert.equal(day(10), 'أيام');
  assert.equal(day(11), 'يومًا');
  assert.equal(day(99), 'يومًا');
  assert.equal(day(100), 'يوم');
  assert.equal(day(103), 'أيام');
});
