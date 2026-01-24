"use client"

import * as React from "react"
import { Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SOUND_ENABLED_KEY = 'streamAgenda_soundEnabled'

export function useSoundEnabled() {
  const [soundEnabled, setSoundEnabled] = React.useState(true)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem(SOUND_ENABLED_KEY)
    if (saved !== null) {
      setSoundEnabled(saved === 'true')
    }
  }, [])

  const toggleSound = React.useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev
      localStorage.setItem(SOUND_ENABLED_KEY, String(newValue))
      return newValue
    })
  }, [])

  return { soundEnabled, toggleSound, mounted }
}

export function SoundToggle() {
  const { soundEnabled, toggleSound, mounted } = useSoundEnabled()

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled className="h-9 w-9 rounded-full">
        <Volume2 className="h-5 w-5" />
        <span className="sr-only">Toggle sound</span>
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSound}
            className="relative h-9 w-9 rounded-full hover:bg-primary/10 transition-colors"
          >
            <Volume2 
              className={`h-5 w-5 transition-all duration-300 ${
                soundEnabled ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`} 
            />
            <VolumeX 
              className={`absolute h-5 w-5 transition-all duration-300 ${
                soundEnabled ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
              }`} 
            />
            <span className="sr-only">Toggle sound</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{soundEnabled ? 'Sound on' : 'Sound off'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
