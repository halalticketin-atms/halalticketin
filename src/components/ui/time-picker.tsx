"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerProps {
    /** Value in HH:MM (24-hour) format */
    value?: string
    /** Callback with value in HH:MM format */
    onChange?: (value: string) => void
    /** Placeholder text */
    placeholder?: string
    /** Disable the picker */
    disabled?: boolean
    /** Additional class names for the trigger button */
    className?: string
    /** Error state */
    hasError?: boolean
    /** Time interval in minutes (default: 15) */
    interval?: number
    /** ID for form association */
    id?: string
    /** Name for form association */
    name?: string
}

/**
 * Generate time slots for the picker, starting at 12 PM (noon)
 */
function generateTimeSlots(interval: number = 15): string[] {
    const slots: string[] = []
    // Start at 12 PM (hour 12) and wrap around
    for (let i = 0; i < 24; i++) {
        const hour = (i + 12) % 24
        for (let minute = 0; minute < 60; minute += interval) {
            const h = hour.toString().padStart(2, "0")
            const m = minute.toString().padStart(2, "0")
            slots.push(`${h}:${m}`)
        }
    }
    return slots
}

/**
 * Format time for display (12-hour format with AM/PM)
 */
function formatTimeForDisplay(time: string): string {
    if (!time) return ""
    const [hourStr, minuteStr] = time.split(":")
    const hour = parseInt(hourStr, 10)
    const minute = minuteStr || "00"

    if (isNaN(hour)) return time

    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute} ${period}`
}

/**
 * Parse user input to HH:MM format
 * Accepts formats like: 2:30pm, 14:30, 2:30 PM, 230pm, etc.
 */
function parseTimeInput(input: string): string | null {
    if (!input) return null

    const cleaned = input.trim().toLowerCase()

    // Try to match various formats
    // Format: HH:MM or H:MM (24-hour or 12-hour without AM/PM)
    const timeMatch = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i)
    if (!timeMatch) return null

    let hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2] || "00", 10)
    const period = timeMatch[3]?.toLowerCase()

    // Validate ranges
    if (hours < 0 || hours > 23) return null
    if (minutes < 0 || minutes > 59) return null

    // Handle AM/PM conversion
    if (period === "pm" && hours < 12) {
        hours += 12
    } else if (period === "am" && hours === 12) {
        hours = 0
    }

    // Ensure 24-hour format bounds
    if (hours > 23) return null

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

/**
 * TimePicker component using Popover + ScrollArea
 * Provides consistent cross-browser time selection with custom input
 */
function TimePicker({
    value,
    onChange,
    placeholder = "",
    disabled = false,
    className,
    hasError = false,
    interval = 15,
    id,
    name,
}: TimePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [customInput, setCustomInput] = React.useState("")
    const timeSlots = React.useMemo(() => generateTimeSlots(interval), [interval])
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Scroll to selected time when opening
    React.useEffect(() => {
        if (open && value && scrollRef.current) {
            const selectedIndex = timeSlots.indexOf(value)
            if (selectedIndex >= 0) {
                // Each item is approximately 36px tall
                const scrollPosition = selectedIndex * 36 - 72
                scrollRef.current.scrollTop = Math.max(0, scrollPosition)
            }
        }
        // Reset custom input when opening
        if (open) {
            setCustomInput("")
            // Focus input after a short delay
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open, value, timeSlots])

    const handleSelect = (time: string) => {
        if (onChange) {
            onChange(time)
        }
        setOpen(false)
    }

    const handleCustomSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const parsed = parseTimeInput(customInput)
        if (parsed) {
            handleSelect(parsed)
        }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            const parsed = parseTimeInput(customInput)
            if (parsed) {
                handleSelect(parsed)
            }
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    title={value ? formatTimeForDisplay(value) : placeholder}
                    className={cn(
                        "h-11 w-full min-w-0 justify-start overflow-hidden text-left font-normal",
                        !value && "text-muted-foreground",
                        hasError && "border-destructive focus-visible:ring-destructive",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                        {value ? formatTimeForDisplay(value) : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                {/* Custom time input */}
                <form onSubmit={handleCustomSubmit} className="p-2 border-b">
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder="Type time (e.g. 2:30pm)"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="h-9 text-sm"
                    />
                </form>

                {/* Quick select time slots */}
                <ScrollArea className="h-[240px]" ref={scrollRef}>
                    <div className="p-1">
                        {timeSlots.map((time) => (
                            <button
                                key={time}
                                type="button"
                                onClick={() => handleSelect(time)}
                                className={cn(
                                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                                    value === time && "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                            >
                                {formatTimeForDisplay(time)}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
            {/* Hidden input for form compatibility */}
            {name && <input type="hidden" name={name} value={value || ""} />}
        </Popover>
    )
}

export { TimePicker, formatTimeForDisplay }
