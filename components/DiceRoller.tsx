'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/8bit/card'
import { Button } from '@/components/ui/8bit/button'
import { FaDiceD20 } from "react-icons/fa6";

interface DiceRollerProps {
  notation: string
  onClose: () => void
}

function rollDice(notation: string) {
  // Regex: 1d20, 2d6+4, 1d8-1
  const regex = /^(\d+)d(\d+)(?:([+-])(\d+))?$/i
  const match = notation.match(regex)
  if (!match) return null

  const count = parseInt(match[1], 10)
  const sides = parseInt(match[2], 10)
  const sign = match[3]
  const modifier = match[4] ? parseInt(match[4], 10) : 0

  if (count > 100 || sides > 1000) return null // Sanity

  const rolls = []
  let sum = 0
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1
    rolls.push(r)
    sum += r
  }

  if (sign === '+') sum += modifier
  else if (sign === '-') sum -= modifier

  return { rolls, sum, modifier, sign, count, sides }
}

export function DiceRollerPopup({ notation, onClose }: DiceRollerProps) {
  const [result, setResult] = useState(() => rollDice(notation))

  // Re-roll if notation heavily changes, or on mount
  useEffect(() => {
    setResult(rollDice(notation))
  }, [notation])

  const handleReroll = () => {
    setResult(rollDice(notation))
  }

  if (!result) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b-2 border-black dark:border-white">
          <CardTitle className="text-sm"><FaDiceD20/> Rolling {notation}</CardTitle>
          <Button variant="outline" size="sm" onClick={onClose} className="h-6 px-2 text-[10px]">✕</Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-center">
          <div className="font-press-start text-4xl text-yellow-600 dark:text-yellow-400 py-4">
            {result.sum}
          </div>
          
          <div className="font-mono text-xs text-muted-foreground flex flex-wrap justify-center gap-1">
            [{result.rolls.join(', ')}] {result.sign && `${result.sign} ${result.modifier}`}
          </div>

          <div className="pt-2">
            <Button variant="secondary" className="w-full" onClick={handleReroll}>
              Reroll <FaDiceD20/>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
