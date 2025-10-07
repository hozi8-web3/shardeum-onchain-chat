import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ShardTalk',
  description: 'A decentralized chat application built on Shardeum EVM Testnet (Mezame) blockchain',
  icons: {
    icon: '/favicon.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen">
            {children}
          </div>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Forcefully remove Next.js development tools
              function removeNextJSTools() {
                const selectors = [
                  '[data-nextjs-dev-tools-button]',
                  '[data-next-mark]',
                  '[data-nextjs-dev-tools]',
                  '.nextjs-dev-tools',
                  '.nextjs-dev-tools-button',
                  'button[data-nextjs-dev-tools-button]',
                  'button[data-next-mark]',
                  'div[data-nextjs-dev-tools]',
                  'div[class*="nextjs-dev-tools"]'
                ];
                
                selectors.forEach(selector => {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(el => {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.opacity = '0';
                    el.style.pointerEvents = 'none';
                    el.style.position = 'absolute';
                    el.style.left = '-9999px';
                    el.style.top = '-9999px';
                    el.style.zIndex = '-9999';
                  });
                });
              }
              
              // Run immediately
              removeNextJSTools();
              
              // Run after DOM is loaded
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', removeNextJSTools);
              }
              
              // Run after page is fully loaded
              window.addEventListener('load', removeNextJSTools);
              
              // Run periodically to catch any new elements
              setInterval(removeNextJSTools, 1000);
            `,
          }}
        />
      </body>
    </html>
  )
}