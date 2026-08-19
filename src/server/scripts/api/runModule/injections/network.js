import net from "net";

export function createSecureNetFacade(allowedDomains = []) {
  const isDomainAllowed = (urlStr) => {
    if (!allowedDomains || allowedDomains.length === 0) return true; // Wildcard if empty
    try {
      const url = new URL(urlStr);
      return allowedDomains.includes(url.hostname);
    } catch {
      return false;
    }
  };

  return {
    "fetch": {
      async fetch(url, options) {
        if (!isDomainAllowed(url))
          throw new Error(`[SecurityError] Domain not allowed: ${url}`);
        const res = await globalThis.fetch(url, options);
        // Return a serializable object instead of a raw Response
        return {
          status: res.status,
          ok: res.ok,
          body: await res.text(),
        };
      },
    },
    "connect": {
      async connect(port, host) {
        if (!isDomainAllowed(`tcp://${host}:${port}`))
          throw new Error(`[SecurityError] Host not allowed: ${host}`);
        return new Promise((resolve, reject) => {
          const socket = net.createConnection({ port, host }, () => {
            socket.destroy();
            resolve(true);
          });
          socket.on("error", reject);
        });
      },
    },
  };
}
