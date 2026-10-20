import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgressPercentage,
  calculateStreaks,
  awardPointsSafely,
  splitTextIntoSentences,
  formatReadingDuration,
} from './rules.ts';

test('calculateProgressPercentage clamps and rounds correctly', () => {
  assert.equal(calculateProgressPercentage(5, 10), 50);
  assert.equal(calculateProgressPercentage(1, 3), 33);
  assert.equal(calculateProgressPercentage(10, 10), 100);
  assert.equal(calculateProgressPercentage(15, 10), 100); // capped at 100
  assert.equal(calculateProgressPercentage(0, 10), 0);
  assert.equal(calculateProgressPercentage(-2, 10), 0);
  assert.equal(calculateProgressPercentage(5, 0), 0);
});

test('calculateStreaks calculates consecutive active days and longest streak', () => {
  const todayStr = '2026-10-19';
  const sessions = [
    { date: '2026-10-19', pagesRead: 12, minutes: 20 },
    { date: '2026-10-18', pagesRead: 8, minutes: 15 },
    { date: '2026-10-17', pagesRead: 15, minutes: 25 },
    { date: '2026-10-15', pagesRead: 4, minutes: 10 },
    { date: '2026-10-14', pagesRead: 20, minutes: 30 },
  ];

  const result = calculateStreaks(sessions, todayStr);
  assert.equal(result.currentStreak, 3); // 17, 18, 19
  assert.equal(result.longestStreak, 3);

  // Test empty sessions
  assert.deepEqual(calculateStreaks([], todayStr), { currentStreak: 0, longestStreak: 0 });

  // Test zero pages read filter
  const zeroSession = [{ date: '2026-10-19', pagesRead: 0, minutes: 5 }];
  assert.deepEqual(calculateStreaks(zeroSession, todayStr), { currentStreak: 0, longestStreak: 0 });
});

test('awardPointsSafely prevents duplicate awards for same action ID', () => {
  const currentPoints = 100;
  const initialActionIds = ['action-1'];

  // First award succeeds
  const res1 = awardPointsSafely(currentPoints, initialActionIds, 'quiz-today-1', 'quiz_pass');
  assert.equal(res1.awarded, true);
  assert.equal(res1.newPoints, 115);
  assert.equal(res1.updatedActionIds.includes('quiz-today-1'), true);

  // Second award with same actionId is rejected
  const res2 = awardPointsSafely(res1.newPoints, res1.updatedActionIds, 'quiz-today-1', 'quiz_pass');
  assert.equal(res2.awarded, false);
  assert.equal(res2.newPoints, 115);
});

test('splitTextIntoSentences splits text accurately for audio reading', () => {
  const sample = 'Marcus Aurelius said: "You have power over your mind - not outside events." Realize this, and you will find strength. What do you think?';
  const sentences = splitTextIntoSentences(sample);
  assert.equal(sentences.length, 3);
  assert.equal(sentences[0], 'Marcus Aurelius said: "You have power over your mind - not outside events."');
  assert.equal(sentences[1], 'Realize this, and you will find strength.');
  assert.equal(sentences[2], 'What do you think?');
});

test('formatReadingDuration formats minutes and hours cleanly', () => {
  assert.equal(formatReadingDuration(0), '0 mins');
  assert.equal(formatReadingDuration(1), '1 min');
  assert.equal(formatReadingDuration(45), '45 mins');
  assert.equal(formatReadingDuration(60), '1 hr');
  assert.equal(formatReadingDuration(90), '1 hr 30 mins');
  assert.equal(formatReadingDuration(120), '2 hrs');
});
