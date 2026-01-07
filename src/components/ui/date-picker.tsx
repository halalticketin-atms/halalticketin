"use client"

import * as React from "react"
import { format, parse, isValid, startOfDay } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    /** Value in YYYY-MM-DD format */
    value?: string
    /** Callback with value in YYYY-MM-DD format */
    onChange?: (value: string) => void
    /** Placeholder text */
    placeholder?: string
    /** Disable the picker */
    disabled?: boolean
    /** Additional class names for the trigger button */
    className?: string
    /** Error state */
    hasError?: boolean
    /** Minimum selectable date */
    minDate?: Date
    /** Maximum selectable date */
    maxDate?: Date
    /** Disable past dates (before today) */
    disablePast?: boolean
    /** ID for form association */
    id?: string
    /** Name for form association */
    name?: string
}

/**
 * DatePicker component using shadcn Calendar + Popover
 * Provides consistent cross-browser date selection
 */
function DatePicker({
    value,
    onChange,
    placeholder = "Select date",
    disabled = false,
    className,
    hasError = false,
    minDate,
    maxDate,
    disablePast = false,
    id,
    name,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    // Parse the string value to Date object
    const dateValue = React.useMemo(() => {
        if (!value) return undefined
        const parsed = parse(value, "yyyy-MM-dd", new Date())
        return isValid(parsed) ? parsed : undefined
    }, [value])

    // Calculate effective minDate
    const effectiveMinDate = React.useMemo(() => {
        const today = startOfDay(new Date())
        if (disablePast && minDate) {
            return minDate > today ? minDate : today
        }
        if (disablePast) {
            return today
        }
        return minDate
    }, [disablePast, minDate])

    // Handle date selection
    const handleSelect = (date: Date | undefined) => {
        if (date && onChange) {
            onChange(format(date, "yyyy-MM-dd"))
        }
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "h-11 w-full justify-start text-left font-normal",
                        !dateValue && "text-muted-foreground",
                        hasError && "border-destructive focus-visible:ring-destructive",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue ? format(dateValue, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={handleSelect}
                    disabled={(date) => {
                        if (effectiveMinDate && date < effectiveMinDate) return true
                        if (maxDate && date > maxDate) return true
                        return false
                    }}
                    initialFocus
                />
            </PopoverContent>
            {/* Hidden input for form compatibility */}
            {name && <input type="hidden" name={name} value={value || ""} />}
        </Popover>
    )
}

export { DatePicker }
