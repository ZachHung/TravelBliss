import { renderHook } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthProvider';
import useAuth from './useAuth';

describe('useAuth', () => {
  it('throws when used outside of <AuthProvider>', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth has to be used within <AuthProvider>'
    );

    spy.mockRestore();
  });

  it('returns the context value inside the provider', () => {
    const value = {
      info: [undefined, false],
      onLogin: [],
      onLogout: [vi.fn()],
    } as unknown as AuthContextValue;

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      ),
    });

    expect(result.current).toBe(value);
  });
});
