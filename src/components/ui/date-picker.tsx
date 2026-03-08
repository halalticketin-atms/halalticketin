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
    /** Enable year/month dropdowns for quick navigation (useful for birth dates) */
    showYearMonthDropdowns?: boolean
    /** Starting year for dropdown (defaults to 100 years ago) */
    fromYear?: number
    /** Ending year for dropdown (defaults to current year) */
    toYear?: number
    /** Default month to show when no value is set */
    defaultMonth?: Date
}

/**
 * DatePicker component using shadcn Calendar + Popover
 * Provides consistent cross-browser date selection
 */
function DatePicker({
    value,
    onChange,
    placeholder = "",
    disabled = false,
    className,
    hasError = false,
    minDate,
    maxDate,
    disablePast = false,
    id,
    name,
    showYearMonthDropdowns = false,
    fromYear,
    toYear,
    defaultMonth,
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

    // Calculate year range for dropdowns
    const currentYear = new Date().getFullYear()
    const effectiveFromYear = fromYear ?? currentYear - 100
    const effectiveToYear = toYear ?? currentYear

    // Calculate default month - if no value, use provided default or a sensible one for birth dates
    const effectiveDefaultMonth = React.useMemo(() => {
        if (dateValue) return dateValue
        if (defaultMonth) return defaultMonth
        // For birth date selectors, default to 25 years ago
        if (showYearMonthDropdowns) {
            return new Date(currentYear - 25, 0, 1)
        }
        return undefined
    }, [dateValue, defaultMonth, showYearMonthDropdowns, currentYear])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={disabled}
                    title={dateValue ? format(dateValue, "PPP") : placeholder}
                    className={cn(
                        "h-11 w-full min-w-0 justify-start overflow-hidden text-left font-normal",
                        !dateValue && "text-muted-foreground",
                        hasError && "border-destructive focus-visible:ring-destructive",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                        {dateValue ? format(dateValue, "PPP") : placeholder}
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={handleSelect}
                    defaultMonth={effectiveDefaultMonth}
                    captionLayout={showYearMonthDropdowns ? "dropdown" : "label"}
                    fromYear={showYearMonthDropdowns ? effectiveFromYear : undefined}
                    toYear={showYearMonthDropdowns ? effectiveToYear : undefined}
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
