import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async rewrites() {
    // `app/_links` is treated as a private folder by Next (underscore prefix),
    // so we serve this page from `app/internal-links` and map the public URL.
    return [{ source: '/_links', destination: '/internal-links' }]
  },
}

export default nextConfig