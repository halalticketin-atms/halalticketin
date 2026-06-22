'use client';

import { useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, ChevronUp, ChevronDown, Trash2, Plus, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DraftCustomQuestion } from '@/hooks/useEventDraft';

export interface QuestionAccent {
    chip: string;
    label: string;
    border: string;
    ring: string;
}

// Same calm palette the ticket cards cycle through, so a question's colour
// reads as a sibling of its ticket. Kept as literal class strings so Tailwind
// keeps them in the build.
export const QUESTION_ACCENTS: QuestionAccent[] = [
    { chip: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-600', border: 'border-l-emerald-400', ring: 'ring-emerald-300/70' },
    { chip: 'bg-sky-100 text-sky-700', label: 'text-sky-600', border: 'border-l-sky-400', ring: 'ring-sky-300/70' },
    { chip: 'bg-amber-100 text-amber-700', label: 'text-amber-600', border: 'border-l-amber-400', ring: 'ring-amber-300/70' },
    { chip: 'bg-rose-100 text-rose-700', label: 'text-rose-600', border: 'border-l-rose-400', ring: 'ring-rose-300/70' },
    { chip: 'bg-teal-100 text-teal-700', label: 'text-teal-600', border: 'border-l-teal-400', ring: 'ring-teal-300/70' },
    { chip: 'bg-orange-100 text-orange-700', label: 'text-orange-600', border: 'border-l-orange-400', ring: 'ring-orange-300/70' },
];

interface CustomQuestionRowProps {
    question: DraftCustomQuestion;
    index: number;
    total: number;
    accent: QuestionAccent;
    maxLabelLength: number;
    onPatch: (patch: Partial<DraftCustomQuestion>) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

export function CustomQuestionRow({
    question,
    index,
    total,
    accent,
    maxLabelLength,
    onPatch,
    onRemove,
    onMoveUp,
    onMoveDown,
}: CustomQuestionRowProps) {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);

    const isFirst = index === 0;
    const isLast = index === total - 1;
    const options = question.options ?? [];

    const addOption = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed || options.includes(trimmed)) return;
        onPatch({ options: [...options, trimmed] });
    };

    return (
        <Reorder.Item
            value={question}
            dragListener={false}
            dragControls={dragControls}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            whileDrag={{ scale: 1.015 }}
            transition={{ type: 'spring', stiffness: 600, damping: 40 }}
            className={cn('relative', isDragging && 'z-10')}
        >
            <div
                className={cn(
                    'rounded-xl border border-border/60 border-l-[3px] bg-card/60 transition-shadow duration-200',
                    accent.border,
                    isDragging ? cn('shadow-xl ring-1', accent.ring) : 'shadow-sm',
                )}
            >
                {/* Header: drag handle + coloured number subheading + reorder/remove */}
                <div className="flex items-center gap-2.5 px-3 pt-3">
                    <button
                        type="button"
                        aria-label={`Reorder question ${index + 1}`}
                        onPointerDown={(event) => dragControls.start(event)}
                        className="touch-none cursor-grab rounded-md p-1 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>

                    <div className="flex items-baseline gap-1.5">
                        <span
                            className={cn(
                                'flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-sm font-bold tabular-nums',
                                accent.chip,
                            )}
                        >
                            {index + 1}
                        </span>
                        <span className={cn('text-xs font-semibold uppercase tracking-wide', accent.label)}>
                            Question
                        </span>
                    </div>

                    <div className="ml-auto flex items-center gap-1.5">
                        <div className="flex items-center overflow-hidden rounded-lg border border-border/60 shadow-sm">
                            <button
                                type="button"
                                disabled={isFirst}
                                onClick={onMoveUp}
                                aria-label={`Move question ${index + 1} up`}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </button>
                            <div className="h-4 w-px bg-border/60" />
                            <button
                                type="button"
                                disabled={isLast}
                                onClick={onMoveDown}
                                aria-label={`Move question ${index + 1} down`}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={onRemove}
                            aria-label={`Remove question ${index + 1}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="space-y-2 px-3 pb-3 pt-2.5">
                    <Textarea
                        placeholder="Question label"
                        value={question.label}
                        maxLength={maxLabelLength}
                        rows={2}
                        onChange={(event) => onPatch({ label: event.target.value.slice(0, maxLabelLength) })}
                        className="min-h-16 resize-y"
                    />
                    <p className="text-right text-xs text-muted-foreground">
                        {question.label.length}/{maxLabelLength}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <Select
                            value={question.type}
                            onValueChange={(value) => {
                                const newType = value as DraftCustomQuestion['type'];
                                onPatch({
                                    type: newType,
                                    options: newType === 'select' || newType === 'checkbox' ? options : undefined,
                                    ageValidation: newType === 'date' && question.ageValidation === true ? true : undefined,
                                });
                            }}
                        >
                            <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={question.required}
                                onChange={(event) => onPatch({ required: event.target.checked })}
                                className="rounded border-muted-foreground"
                            />
                            Required
                        </label>
                        {question.type === 'date' && (
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={question.ageValidation === true}
                                    onChange={(event) => onPatch({ ageValidation: event.target.checked ? true : undefined })}
                                    className="rounded border-muted-foreground"
                                />
                                Add age validation with date picker
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            aria-label="Age validation help"
                                        >
                                            <Info className="h-3.5 w-3.5" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                        Use this for date-of-birth questions. Attendees must pick a birth date that makes them at
                                        least the event minimum age. Leave this off for other dates.
                                    </TooltipContent>
                                </Tooltip>
                            </label>
                        )}
                    </div>

                    {/* Options for dropdown/checkbox */}
                    {(question.type === 'select' || question.type === 'checkbox') && (
                        <div className="space-y-2 pt-2">
                            <Label className="text-xs text-muted-foreground">Options</Label>
                            {options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {options.map((opt, optIndex) => (
                                        <div
                                            key={optIndex}
                                            className={cn(
                                                'flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs font-medium',
                                                accent.chip,
                                            )}
                                        >
                                            <span>{opt}</span>
                                            <button
                                                type="button"
                                                onClick={() => onPatch({ options: options.filter((_, i) => i !== optIndex) })}
                                                className="rounded-full p-0.5 transition-colors hover:bg-black/10"
                                                aria-label={`Remove option ${opt}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Type an option and press Enter"
                                    className="h-8 flex-1 text-sm"
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            addOption(event.currentTarget.value);
                                            event.currentTarget.value = '';
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3"
                                    onClick={(event) => {
                                        const input = event.currentTarget.previousElementSibling as HTMLInputElement | null;
                                        if (input) {
                                            addOption(input.value);
                                            input.value = '';
                                        }
                                    }}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add
                                </Button>
                            </div>
                            {options.length === 0 && (
                                <p className="text-xs text-amber-600">Add at least one option for attendees to choose from</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Reorder.Item>
    );
}
