/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 14ではApp Routerがデフォルトで有効になっているため、設定不要
  
  
  // Vercel Blob画像の読み込みを許可
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  
  // CSP設定でVercel Blobを許可（開発時は緩く、本番時は厳格に）
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: isDev ? 
              // 開発環境：緩いCSP
              `
                default-src 'self' 'unsafe-inline' 'unsafe-eval';
                script-src 'self' 'unsafe-eval' 'unsafe-inline';
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data: https: blob: *;
                font-src 'self' https://fonts.gstatic.com;
                connect-src 'self' https: wss: blob: *;
                media-src 'self' *;
                worker-src 'self' blob: data:;
                child-src 'self' blob: data:;
              `.replace(/\s+/g, ' ').trim()
              :
              // 本番環境：厳格なCSP
              `
                default-src 'self';
                script-src 'self' 'unsafe-eval' 'unsafe-inline';
                style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                img-src 'self' data: https: blob: https://*.public.blob.vercel-storage.com;
                font-src 'self' https://fonts.gstatic.com;
                connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://*.public.blob.vercel-storage.com;
                media-src 'self' https://*.public.blob.vercel-storage.com;
                worker-src 'self' blob:;
                child-src 'self' blob:;
              `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
