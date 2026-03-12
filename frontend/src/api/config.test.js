import { BASE_URL } from './config';

test('BASE_URL is a non-empty string', () => {
  expect(typeof BASE_URL).toBe('string');
  expect(BASE_URL.length).toBeGreaterThan(0);
});