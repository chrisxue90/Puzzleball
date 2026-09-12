import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '彩色连珠 · Puzzle Ball',
  description: '经典彩色连珠游戏，支持手机、平板与电脑。',
  manifest: '/manifest.webmanifest',
  applicationName: '彩色连珠',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '彩色连珠' },
  formatDetection: { telephone: false },
  openGraph: { title: '彩色连珠 · Puzzle Ball', description: '熟悉的 9×9 彩色连珠，随时随地打开就能玩。', type: 'website', locale: 'zh_CN' },
  twitter: { card: 'summary', title: '彩色连珠 · Puzzle Ball', description: '熟悉的 9×9 彩色连珠，随时随地打开就能玩。' },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#526963',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
