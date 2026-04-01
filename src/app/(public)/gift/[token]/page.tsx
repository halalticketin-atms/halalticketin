'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchGiftClaim,
  submitGiftClaim,
  type GiftClaimEvent,
  type GiftClaimResponse,
} from '@/lib/gift-claim-api';
import {
  buildGiftClaimSubmitPayload,
  createEmptyGiftClaimValidationErrors,
  hasGiftClaimValidationErrors,
  parseCheckboxSelections,
  serializeCheckboxSelections,
  validateGiftClaimForm,
  type GiftClaimValidationErrors,
} from '@/lib/gift-claim-form';
import {
  getGiftClaimLoadErrorMessage,
  isRetryableGiftClaimLoadError,
} from '@/lib/gift-claim-page';

const formatEventDate = (event: GiftClaimEvent) => {
  if (!event.startDatetime) return 'Date to be confirmed';

  const start = new Date(event.startDatetime);
  const end = event.endDatetime ? new Date(event.endDatetime) : null;
  const date = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: event.timezone,
  }).format(start);

  if (!end) {
    return date;
  }

  const endTime = new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
    timeZone: event.timezone,
  }).format(end);

  return `${date} - ${endTime}`;
};

const formatLocation = (event: GiftClaimEvent) => {
  if (event.locationType === 'online') {
    return event.onlineUrl || 'Online event';
  }

  return (
    [event.venue, event.address, event.city, event.country].filter(Boolean).join(', ') ||
    'Location to be confirmed'
  );
};

export default function GiftClaimPage() {
  const params = useParams();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token;

  const [claim, setClaim] = useState<GiftClaimResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [age, setAge] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<GiftClaimValidationErrors>(
    createEmptyGiftClaimValidationErrors,
  );

  const loadClaim = async (giftToken: string) => {
    setIsLoading(true);
    setError(null);
    setLoadError(null);

    try {
      const response = await fetchGiftClaim(giftToken);
      setClaim(response);
      setName(response.ticket.attendeeName ?? '');
      setEmail(response.ticket.attendeeEmail ?? '');
      setGender(response.ticket.attendeeGender ?? '');
      setAge(
        response.ticket.attendeeAge === null || response.ticket.attendeeAge === undefined
          ? ''
          : String(response.ticket.attendeeAge),
      );
      setCustomAnswers(response.ticket.customAnswers ?? {});
      setFieldErrors(createEmptyGiftClaimValidationErrors());
    } catch (err) {
      setClaim(null);
      setLoadError(err);
      setError(getGiftClaimLoadErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError('Gift claim link is invalid.');
      setLoadError(new Error('Gift claim link is invalid.'));
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setError(null);
      setLoadError(null);

      try {
        const response = await fetchGiftClaim(token);
        if (cancelled) return;
        setClaim(response);
        setName(response.ticket.attendeeName ?? '');
        setEmail(response.ticket.attendeeEmail ?? '');
        setGender(response.ticket.attendeeGender ?? '');
        setAge(
          response.ticket.attendeeAge === null || response.ticket.attendeeAge === undefined
            ? ''
            : String(response.ticket.attendeeAge),
        );
        setCustomAnswers(response.ticket.customAnswers ?? {});
        setFieldErrors(createEmptyGiftClaimValidationErrors());
      } catch (err) {
        if (cancelled) return;
        setClaim(null);
        setLoadError(err);
        setError(getGiftClaimLoadErrorMessage(err));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const locationLabel = useMemo(() => (claim ? formatLocation(claim.event) : ''), [claim]);
  const eventDateLabel = useMemo(() => (claim ? formatEventDate(claim.event) : ''), [claim]);

  const downloadQRCode = (ticketId: string, ticketCode: string) => {
    const canvas = document.getElementById(`gift-qr-code-${ticketId}`) as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    const pngUrl = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = pngUrl;
    downloadLink.download = `ticket-${ticketCode}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const clearFieldError = (field: 'name' | 'gender' | 'age') => {
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      return { ...prev, [field]: undefined };
    });
  };

  const clearQuestionError = (questionId: string) => {
    setFieldErrors((prev) => {
      if (!prev.customAnswers[questionId]) {
        return prev;
      }

      const nextCustomAnswers = { ...prev.customAnswers };
      delete nextCustomAnswers[questionId];

      return { ...prev, customAnswers: nextCustomAnswers };
    });
  };

  const handleSubmit = async () => {
    if (!token || !claim) return;

    const nextFieldErrors = validateGiftClaimForm({
      name,
      gender,
      age,
      customAnswers,
      questions: claim.event.customQuestions,
    });

    if (hasGiftClaimValidationErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setError('Please complete the required fields before claiming this ticket.');
      return;
    }

    setFieldErrors(createEmptyGiftClaimValidationErrors());
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await submitGiftClaim(
        token,
        buildGiftClaimSubmitPayload({
          name,
          email,
          gender,
          age,
          customAnswers,
        }),
      );

      setClaim(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to claim this ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12">
        <p className="text-sm text-muted-foreground">Loading your gifted ticket…</p>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4 py-12">
        <Card className="w-full">
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">
              {error || 'Gift claim link is invalid.'}
            </p>
            {token && isRetryableGiftClaimLoadError(loadError) ? (
              <Button variant="outline" onClick={() => void loadClaim(token)}>
                Try again
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            {claim.state === 'claimable'
              ? 'Claim your gifted ticket'
              : claim.state === 'claimed'
                ? 'Ticket claimed'
                : 'Gift link expired'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gifted by {claim.giftedByName} for {claim.event.title || 'this event'}.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-sm font-medium">{claim.event.title || 'Event'}</p>
            <p className="mt-1 text-sm text-muted-foreground">{eventDateLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">{locationLabel}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Ticket type: {claim.ticket.ticketTypeName}
            </p>
            {claim.ticket.ticketCode ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Ticket code: {claim.ticket.ticketCode}
              </p>
            ) : null}
          </div>

          {error ? <Alert>{error}</Alert> : null}

          {claim.state === 'expired' ? (
            <Alert>
              This gift link is no longer valid. Ask the buyer or support for a new link.
            </Alert>
          ) : null}

          {claim.state === 'claimed' ? (
            <Alert>
              Your ticket is ready. Keep this page for entry
              {claim.ticket.attendeeEmail ? ' and check your email for a copy.' : '.'}
            </Alert>
          ) : null}

          {claim.state === 'claimable' ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gift-name">Full name</Label>
                  <Input
                    id="gift-name"
                    value={name}
                    aria-invalid={Boolean(fieldErrors.name)}
                    className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive/40' : undefined}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                      clearFieldError('name');
                    }}
                  />
                  {fieldErrors.name ? (
                    <p className="text-sm text-destructive">{fieldErrors.name}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-email">Email</Label>
                  <Input
                    id="gift-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gift-age">Age</Label>
                  <Input
                    id="gift-age"
                    type="number"
                    min="0"
                    max="120"
                    value={age}
                    aria-invalid={Boolean(fieldErrors.age)}
                    className={fieldErrors.age ? 'border-destructive focus-visible:ring-destructive/40' : undefined}
                    onChange={(e) => {
                      setAge(e.target.value);
                      setError(null);
                      clearFieldError('age');
                    }}
                  />
                  {fieldErrors.age ? (
                    <p className="text-sm text-destructive">{fieldErrors.age}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={gender}
                    onValueChange={(value) => {
                      setGender(value as 'male' | 'female');
                      setError(null);
                      clearFieldError('gender');
                    }}
                  >
                    <SelectTrigger
                      aria-invalid={Boolean(fieldErrors.gender)}
                      className={
                        fieldErrors.gender ? 'border-destructive focus:ring-destructive/40' : undefined
                      }
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.gender ? (
                    <p className="text-sm text-destructive">{fieldErrors.gender}</p>
                  ) : null}
                </div>
              </div>

              {(claim.event.customQuestions ?? []).map((question) => (
                <div key={question.id} className="space-y-2">
                  <Label htmlFor={`gift-question-${question.id}`}>
                    {question.label}
                    {question.required ? ' *' : ''}
                  </Label>
                  {question.type === 'select' ? (
                    <Select
                      value={customAnswers[question.id] ?? ''}
                      onValueChange={(value) => {
                        setCustomAnswers((prev) => ({ ...prev, [question.id]: value }));
                        setError(null);
                        clearQuestionError(question.id);
                      }}
                    >
                      <SelectTrigger
                        id={`gift-question-${question.id}`}
                        aria-invalid={Boolean(fieldErrors.customAnswers[question.id])}
                        className={
                          fieldErrors.customAnswers[question.id]
                            ? 'border-destructive focus:ring-destructive/40'
                            : undefined
                        }
                      >
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {(question.options ?? []).map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : question.type === 'checkbox' ? (
                    question.options && question.options.length > 0 ? (
                      <div className="space-y-2">
                        {question.options.map((option) => {
                          const selectedAnswers = parseCheckboxSelections(customAnswers[question.id]);
                          const isChecked = selectedAnswers.includes(option);

                          return (
                            <label
                              key={option}
                              className="flex items-center gap-2 text-sm text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setCustomAnswers((prev) => {
                                    const currentAnswers = parseCheckboxSelections(prev[question.id]);
                                    const nextAnswers = e.target.checked
                                      ? [
                                          ...currentAnswers.filter((answer) => answer !== option),
                                          option,
                                        ]
                                      : currentAnswers.filter((answer) => answer !== option);

                                    return {
                                      ...prev,
                                      [question.id]: serializeCheckboxSelections(nextAnswers),
                                    };
                                  });
                                  setError(null);
                                  clearQuestionError(question.id);
                                }}
                                className="h-4 w-4 rounded border-border"
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          id={`gift-question-${question.id}`}
                          type="checkbox"
                          checked={customAnswers[question.id] === 'true'}
                          onChange={(e) => {
                            setCustomAnswers((prev) => ({
                              ...prev,
                              [question.id]: e.target.checked ? 'true' : 'false',
                            }));
                            setError(null);
                            clearQuestionError(question.id);
                          }}
                          className="h-4 w-4 rounded border-border"
                        />
                        Yes
                      </label>
                    )
                  ) : (
                    <Input
                      id={`gift-question-${question.id}`}
                      value={customAnswers[question.id] ?? ''}
                      aria-invalid={Boolean(fieldErrors.customAnswers[question.id])}
                      className={
                        fieldErrors.customAnswers[question.id]
                          ? 'border-destructive focus-visible:ring-destructive/40'
                          : undefined
                      }
                      onChange={(e) => {
                        setCustomAnswers((prev) => ({ ...prev, [question.id]: e.target.value }));
                        setError(null);
                        clearQuestionError(question.id);
                      }}
                    />
                  )}
                  {fieldErrors.customAnswers[question.id] ? (
                    <p className="text-sm text-destructive">
                      {fieldErrors.customAnswers[question.id]}
                    </p>
                  ) : null}
                </div>
              ))}

              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Claiming…' : 'Claim ticket'}
              </Button>
            </div>
          ) : null}

          {claim.state === 'claimed' && claim.ticket.ticketCode ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <QRCodeCanvas
                    id={`gift-qr-code-${claim.ticket.id}`}
                    value={claim.ticket.ticketCode}
                    size={220}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">{claim.ticket.ticketTypeName}</p>
                <p className="mt-2 break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-muted-foreground">
                  {claim.ticket.ticketCode}
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Present this QR code at entry, or use the ticket code for manual check-in.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => downloadQRCode(claim.ticket.id, claim.ticket.ticketCode!)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download QR
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
