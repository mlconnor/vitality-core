import * as React from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutosaveEntityFormOptions<TValues extends Record<string, unknown>, TRecord> {
  /** Current route id (string from params) */
  id?: string;
  /** Whether we are in create mode (id === 'new') */
  isNew: boolean;
  /** Current form values (already validated/parsed by schema resolver) */
  values: TValues;
  /** Form state gates */
  isDirty: boolean;
  isValid: boolean;
  /** Debounce window for autosave */
  debounceMs?: number;

  /** CRUD */
  create: (values: TValues) => Promise<TRecord>;
  update: (input: { id: string; data: Partial<TValues> }) => Promise<TRecord>;
  /** Extract the record id from the create/update result */
  getRecordId: (record: TRecord) => string | null | undefined;

  /** Callbacks */
  onCreated?: (record: TRecord) => void;
  onSaved?: (record: TRecord) => void;
}

export interface AutosaveEntityFormResult {
  status: AutosaveStatus;
  lastError: Error | null;
  flush: () => void;
  resetError: () => void;
}

export function useAutosaveEntityForm<TValues extends Record<string, unknown>, TRecord extends Record<string, any>>(
  options: AutosaveEntityFormOptions<TValues, TRecord>
): AutosaveEntityFormResult {
  const {
    id,
    isNew,
    values,
    isDirty,
    isValid,
    debounceMs = 800,
    create,
    update,
    getRecordId,
    onCreated,
    onSaved,
  } = options;

  const [status, setStatus] = React.useState<AutosaveStatus>('idle');
  const [lastError, setLastError] = React.useState<Error | null>(null);

  const createdIdRef = React.useRef<string | null>(null);
  const inFlightRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAfterFlightRef = React.useRef(false);

  // NOTE: react-hook-form's `useWatch()` can return a stable object reference whose
  // internals mutate on change. Memoizing by reference can prevent autosave from
  // triggering. We compute a cheap-ish deep key each render instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableValuesKey = JSON.stringify(values);

  const resetError = React.useCallback(() => setLastError(null), []);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runSave = React.useCallback(async () => {
    if (!isDirty || !isValid) return;
    if (inFlightRef.current) {
      pendingAfterFlightRef.current = true;
      return;
    }

    const effectiveId = createdIdRef.current ?? (id && id !== 'new' ? id : null);

    inFlightRef.current = true;
    setStatus('saving');
    setLastError(null);

    try {
      let record: TRecord;

      if (isNew && !effectiveId) {
        record = await create(values);
        const newId = getRecordId(record) ?? null;
        if (typeof newId === 'string' && newId.length > 0) {
          createdIdRef.current = newId;
        }
        onCreated?.(record);
      } else {
        if (!effectiveId) {
          throw new Error('Cannot save: missing record id');
        }
        record = await update({ id: effectiveId, data: values });
        onSaved?.(record);
      }

      setStatus('saved');
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to save');
      setLastError(e);
      setStatus('error');
    } finally {
      inFlightRef.current = false;
      if (pendingAfterFlightRef.current) {
        pendingAfterFlightRef.current = false;
        // Save again soon to catch latest edits made while we were saving.
        clearTimer();
        timerRef.current = setTimeout(() => {
          runSave();
        }, 50);
      }
    }
  }, [clearTimer, create, getRecordId, id, isDirty, isNew, isValid, onCreated, onSaved, update, values]);

  const scheduleSave = React.useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      runSave();
    }, debounceMs);
  }, [clearTimer, debounceMs, runSave]);

  // Only autosave for EXISTING items (not new ones).
  // New items require explicit "Create" action via flush().
  React.useEffect(() => {
    if (isNew) return; // Skip autosave for new items
    if (!isDirty) return;
    if (!isValid) return;
    scheduleSave();
    return () => {
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableValuesKey, isDirty, isValid, isNew, scheduleSave]);

  const flush = React.useCallback(() => {
    clearTimer();
    void runSave();
  }, [clearTimer, runSave]);

  return { status, lastError, flush, resetError };
}


