import { apiFetch } from './http';

// Mock the config module so BASE_URL is predictable in tests
vi.mock('./config', () => ({ BASE_URL: 'http://localhost:8000' })); 
describe('apiFetch', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('constructs the correct URL from BASE_URL + path', async () => {
    const mockJson = { status: 'ok' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockJson,
    });

    await apiFetch('/health');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/health',
      expect.objectContaining({})
    );
  });

  test('sets Content-Type: application/json on POST requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await apiFetch('/plan/recalculate', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/plan/recalculate',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  test('throws ApiError with correct status on non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: async () => ({ detail: 'Validation failed' }),
    });

    await expect(apiFetch('/plan/recalculate', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'Validation failed',
    });
  });

  test('returns parsed JSON on a 200 response', async () => {
    const mockData = { status: 'ok', version: '1.0.0' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await apiFetch('/health');
    expect(result).toEqual(mockData);
  });
});