import './globals.css'
import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/8bit/card'

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-press-start',
})

export const metadata: Metadata = {
  title: {
    default: 'Bag of — Party Loot Manager',
    template: '%s | Bag of'
  },
  description: 'Manage your TTRPG party inventory with ease. No accounts, just simple 8-bit loot tracking for DMs and players.',
}

export default function RootLayout({ children }: { children: React.ReactNode })
{
  return (
    <html lang="en" className={pressStart.variable} suppressHydrationWarning>
      <body className="font-sans antialiased flex flex-col min-h-[100dvh]">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Migrate old 'bag-of-theme' key (values were 'dark'/'light')
                const oldTheme = localStorage.getItem('bag-of-theme');
                if (oldTheme === 'dark' || oldTheme === 'light') {
                  const migratedSlug = oldTheme === 'dark' ? 'default' : 'soft-pop';
                  localStorage.setItem('bag-of-color-theme', migratedSlug);
                  localStorage.setItem('bag-of-mode', oldTheme);
                  localStorage.removeItem('bag-of-theme');
                }
                const mode = localStorage.getItem('bag-of-mode');
                const themeSlug = localStorage.getItem('bag-of-color-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const isDark = mode === 'dark' || (!mode && prefersDark);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                }
                const slug = themeSlug || (prefersDark ? 'default' : 'soft-pop');
                if (slug && slug !== 'default') {
                  document.documentElement.setAttribute('data-theme', slug);
                }
              } catch (_) {}
            `,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <div id="footer" className='ps-10 pe-10 pt-4 pb-4'>
          <Card>
            <CardHeader>
              <CardTitle></CardTitle>
              <CardDescription>©2026 <a className='underline' href="https://www.simulacrumtechnologies.com" target="_blank">Simulacrum Technologies</a></CardDescription>
            </CardHeader>
            <CardContent>
              <p>All rights reserved. Website design and content are protected by copyright law. Built by DMs, for DMs.</p>
              <p>Join our <a className='text-stone-500 underline' href="https://discord.gg/m4AnYSDueM" target="_blank">Discord server</a> for updates and to provide feedback.</p>
              <p>Please also check out our <a href="http://battletracker.simulacrumtechnologies.com/" target="_blank" className="text-stone-500 underline">Battle Tracker</a> app.</p>
            </CardContent>
            <CardFooter>
            </CardFooter>
          </Card>

        </div>
      </body>
    </html>
  )
}
