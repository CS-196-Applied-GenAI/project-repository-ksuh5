import { checkHealth } from './healthApi';
import { apiFetch } from './http';

vi.mock('./http');

describe('checkHealth', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('calls apiFetch with GET /health and returns status + version', async () => {
    const mockResponse = { status: 'ok', version: '1.0.0' };
    apiFetch.mockResolvedValue(mockResponse);

    const result = await checkHealth();

    expect(apiFetch).toHaveBeenCalledWith('/health');
    expect(result).toEqual({ status: 'ok', version: '1.0.0' });
  });

  test('propagates errors thrown by apiFetch', async () => {
    apiFetch.mockRejectedValue(new Error('Network error'));

    await expect(checkHealth()).rejects.toThrow('Network error');
  });
});