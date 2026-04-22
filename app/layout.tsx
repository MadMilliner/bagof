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
      <body className="font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('bag-of-theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
        <ThemeProvider>{children}</ThemeProvider>
        <div id="footer" className='h-[5dvh] ps-10 pe-10 pt-[2dvh] pb-[2dvh]'>
          <Card>
            <CardHeader>
              <CardTitle></CardTitle>
              <CardDescription>©2026 <a className='underline' href="https://www.simulacrumtechnologies.com" target="_blank">Simulacrum Technologies</a></CardDescription>
            </CardHeader>
            <CardContent>
              <p>All rights reserved. Website design and content are protected by copyright law. Built by DMs, for DMs.</p>
              <p>Join our <a className='text-stone-500 underline' href="https://discord.gg/m4AnYSDueM" target="_blank">Discord server</a> for updates and to provide feedback.</p>
            </CardContent>
            <CardFooter>
            </CardFooter>
          </Card>

        </div>
      </body>
    </html>
  )
}
