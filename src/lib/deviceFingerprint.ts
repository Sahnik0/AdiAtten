
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Initialize an agent at application startup
const fpPromise = FingerprintJS.load();

export async function getDeviceId(): Promise<string> {
  // Get the visitor identifier
  const fp = await fpPromise;
  const result = await fp.get();
  
  // Return the fingerprint as a device ID
  return result.visitorId;
}
