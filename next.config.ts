import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
