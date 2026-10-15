// Only the Account cookie and the client address cross to the backend.
export function forwardedHeaders(incoming: Pick<Headers, "get">): Headers {
  const forwarded = new Headers();
  for (const name of ["cookie", "x-forwarded-for"]) {
    const value = incoming.get(name);
    if (value) forwarded.set(name, value);
  }
  return forwarded;
}
