/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for better performance
  output: 'standalone',
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Reduce bundle size
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
    },
  },
}

export default nextConfig