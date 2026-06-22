'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, Library, Loader2, Search } from 'lucide-react';

import type { DraftCustomQuestion } from '@/hooks/useEventDraft';
import {
  fetchCustomQuestionLibrary,
  type CustomQuestionLibraryItem,
} from '@/lib/events-api';
import {
  isQuestionAlreadyPresent,
  MAX_CUSTOM_QUESTIONS,
} from '@/lib/custom-question-library';
import { getUserFriendlyMessage } from '@/lib/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const questionTypeLabel: Record<CustomQuestionLibraryItem['type'], string> = {
  text: 'Text',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
};

interface CustomQuestionLibraryDialogProps {
  organizerId: string | null;
  existingQuestions: DraftCustomQuestion[];
  onAddQuestions: (questions: CustomQuestionLibraryItem[]) => void;
}

export function CustomQuestionLibraryDialog({
  organizerId,
  existingQuestions,
  onAddQuestions,
}: CustomQuestionLibraryDialogProps) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<CustomQuestionLibraryItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const remainingCapacity = Math.max(0, MAX_CUSTOM_QUESTIONS - existingQuestions.length);

  const loadQuestions = useCallback((targetOrganizerId: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    void fetchCustomQuestionLibrary(targetOrganizerId)
      .then((response) => {
        if (requestId === requestIdRef.current) setQuestions(response.questions);
      })
      .catch((requestError) => {
        if (requestId === requestIdRef.current) {
          setQuestions([]);
          setError(getUserFriendlyMessage(requestError) || 'Unable to load previous questions.');
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });
  }, []);

  const selectedQuestions = useMemo(
    () =>
      questions
        .filter(
          (question) =>
            selectedKeys.has(question.key) &&
            !isQuestionAlreadyPresent(question, existingQuestions),
        )
        .slice(0, remainingCapacity),
    [existingQuestions, questions, remainingCapacity, selectedKeys],
  );

  const visibleQuestions = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return questions;

    return questions.filter((question) =>
      [
        question.label,
        questionTypeLabel[question.type],
        question.required ? 'required' : 'optional',
        question.mostRecentEvent.title,
        ...(question.options ?? []),
      ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
    );
  }, [questions, search]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      requestIdRef.current += 1;
      setSelectedKeys(new Set());
      setSearch('');
    }
  };

  const handleAdd = () => {
    onAddQuestions(selectedQuestions);
    handleOpenChange(false);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          if (!organizerId) return;
          setOpen(true);
          loadQuestions(organizerId);
        }}
        disabled={!organizerId || remainingCapacity === 0}
        className="min-h-9"
      >
        <Library className="mr-1.5 h-3.5 w-3.5" />
        Use previous question
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[calc(100dvh-1rem)] grid-rows-none flex-col gap-0 p-0 sm:max-h-[min(760px,calc(100dvh-3rem))] sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6 sm:py-5">
            <DialogTitle>Use previous questions</DialogTitle>
            <DialogDescription>
              Select up to {remainingCapacity} question{remainingCapacity === 1 ? '' : 's'}. Copies can be edited without changing past events.
            </DialogDescription>
          </DialogHeader>

          <div className="border-b px-4 py-3 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search questions, options, or events"
                aria-label="Search previous questions"
                className="h-10 pl-9"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-4 sm:p-6">
              {isLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading previous questions…
                </div>
              ) : error ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    if (organizerId) loadQuestions(organizerId);
                  }}>
                    Try again
                  </Button>
                </div>
              ) : visibleQuestions.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center">
                  <Library className="mb-3 h-7 w-7 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {questions.length === 0 ? 'No previous questions yet' : 'No matching questions'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {questions.length === 0
                      ? 'Questions saved on accessible events will appear here.'
                      : 'Try a different search term.'}
                  </p>
                </div>
              ) : (
                visibleQuestions.map((question) => {
                  const alreadyPresent = isQuestionAlreadyPresent(question, existingQuestions);
                  const isSelected = selectedQuestions.some((selected) => selected.key === question.key);
                  const capacityReached = selectedQuestions.length >= remainingCapacity && !isSelected;
                  const disabled = alreadyPresent || capacityReached;

                  return (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-label={`Select ${question.label}`}
                      disabled={disabled}
                      key={question.key}
                      onClick={() => {
                        setSelectedKeys((current) => {
                          const next = new Set(current);
                          if (isSelected) next.delete(question.key);
                          else next.add(question.key);
                          return next;
                        });
                      }}
                      className={`flex min-h-24 w-full gap-3 rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-4 ${
                        disabled
                          ? 'cursor-not-allowed bg-muted/40 opacity-60'
                          : isSelected
                            ? 'cursor-pointer border-primary/50 bg-primary/5'
                            : 'cursor-pointer hover:border-primary/30 hover:bg-muted/30'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-background'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="break-words text-sm font-medium leading-5 text-foreground">
                            {question.label}
                          </p>
                          {alreadyPresent && (
                            <Badge variant="secondary" className="shrink-0 gap-1 text-[11px]">
                              <Check className="h-3 w-3" /> Already added
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {questionTypeLabel[question.type]} · {question.required ? 'Required' : 'Optional'}
                        </p>
                        {(question.options?.length ?? 0) > 0 && (
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                            Options: {question.options?.join(', ')}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Used in “{question.mostRecentEvent.title}”
                          {` · ${question.usageCount} event${question.usageCount === 1 ? '' : 's'}`}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t bg-background px-4 py-4 sm:px-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={selectedQuestions.length === 0} onClick={handleAdd}>
              Add {selectedQuestions.length > 0 ? selectedQuestions.length : ''} question{selectedQuestions.length === 1 ? '' : 's'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
