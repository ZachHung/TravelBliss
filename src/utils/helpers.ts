export const parseJwt = (jwt: string): Record<string, unknown> | null => {
  const b64DecodeUnicode = (str: string) =>
    decodeURIComponent(
      Array.prototype.map
        .call(atob(str), (c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );

  if (!jwt) {
    return null;
  }

  try {
    return JSON.parse(b64DecodeUnicode(jwt.split('.')[1].replace('-', '+').replace('_', '/')));
  } catch {
    return null;
  }
};
