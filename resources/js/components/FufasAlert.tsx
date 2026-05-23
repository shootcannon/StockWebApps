import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

/* ── Types ──────────────────────────────────────────── */

type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    kind: ToastKind;
    exiting?: boolean;
}

interface ConfirmOpts {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
    onConfirm: () => void | Promise<void>;
}

interface AlertCtx {
    toast:   (msg: string, kind?: ToastKind) => void;
    success: (msg: string) => void;
    error:   (msg: string) => void;
    warning: (msg: string) => void;
    info:    (msg: string) => void;
    confirm: (opts: ConfirmOpts) => void;
}

/* ── Context ────────────────────────────────────────── */

const Ctx = createContext<AlertCtx>({
    toast:   () => {},
    success: () => {},
    error:   () => {},
    warning: () => {},
    info:    () => {},
    confirm: () => {},
});

export function useAlert(): AlertCtx {
    return useContext(Ctx);
}

/* ── Provider ───────────────────────────────────────── */

let uid = 1;

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [toasts,  setToasts]  = useState<Toast[]>([]);
    const [dialog,  setDialog]  = useState<ConfirmOpts | null>(null);
    const [busy,    setBusy]    = useState(false);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) =>
            prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, []);

    const addToast = useCallback(
        (message: string, kind: ToastKind = 'info', ms = 4000) => {
            const id = uid++;
            setToasts((prev) => [...prev, { id, message, kind }]);
            if (ms > 0) setTimeout(() => dismiss(id), ms);
        },
        [dismiss],
    );

    const toast   = useCallback((msg: string, kind?: ToastKind) => addToast(msg, kind), [addToast]);
    const success = useCallback((msg: string) => addToast(msg, 'success'),         [addToast]);
    const error   = useCallback((msg: string) => addToast(msg, 'error', 5500),     [addToast]);
    const warning = useCallback((msg: string) => addToast(msg, 'warning'),         [addToast]);
    const info    = useCallback((msg: string) => addToast(msg, 'info'),            [addToast]);
    const confirm = useCallback((opts: ConfirmOpts) => setDialog(opts), []);

    async function handleConfirm() {
        if (!dialog) return;
        setBusy(true);
        try {
            await dialog.onConfirm();
        } finally {
            setBusy(false);
            setDialog(null);
        }
    }

    return (
        <Ctx.Provider value={{ toast, success, error, warning, info, confirm }}>
            {children}

            {/* ── Toast stack ──────────────────────────── */}
            <div
                className="pointer-events-none fixed right-4 top-4 z-[9998] flex flex-col gap-2"
                style={{ minWidth: 280, maxWidth: 360 }}
            >
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
                ))}
            </div>

            {/* ── Confirm dialog ───────────────────────── */}
            {dialog && (
                <div
                    className="fixed inset-0 z-[9997] flex items-center justify-center p-4"
                    style={{ animation: 'fade-in 0.18s ease-out' }}
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
                        onClick={() => !busy && setDialog(null)}
                    />

                    {/* Dialog card */}
                    <div
                        className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
                        style={{ animation: 'modal-in 0.2s ease-out' }}
                    >
                        {/* Icon badge */}
                        <div
                            className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full ${
                                dialog.danger
                                    ? 'bg-red-500/10 text-red-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                        >
                            {dialog.danger ? (
                                <AlertTriangle className="h-5 w-5" />
                            ) : (
                                <CheckCircle className="h-5 w-5" />
                            )}
                        </div>

                        <h4 className="mb-1 text-base font-semibold text-[var(--fg)]">
                            {dialog.title}
                        </h4>
                        {dialog.description && (
                            <p className="mb-5 text-sm text-[var(--muted)]">{dialog.description}</p>
                        )}
                        {!dialog.description && <div className="mb-5" />}

                        <div className="flex gap-2">
                            <button
                                disabled={busy}
                                onClick={() => setDialog(null)}
                                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm font-medium text-[var(--fg)] transition hover:bg-[var(--surface-3)] disabled:opacity-50"
                            >
                                {dialog.cancelLabel ?? 'Batal'}
                            </button>
                            <button
                                disabled={busy}
                                onClick={handleConfirm}
                                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-60 ${
                                    dialog.danger
                                        ? 'bg-red-500 hover:bg-red-400'
                                        : 'bg-emerald-500 hover:bg-emerald-400'
                                }`}
                            >
                                {busy ? (
                                    <span className="inline-flex items-center justify-center gap-1.5">
                                        <span
                                            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                                            style={{ animation: 'fufas-spin 0.7s linear infinite' }}
                                        />
                                        Memproses…
                                    </span>
                                ) : (
                                    dialog.confirmLabel ?? 'Konfirmasi'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Ctx.Provider>
    );
}

/* ── Toast item ─────────────────────────────────────── */

const KINDS: Record<ToastKind, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
    success: { icon: CheckCircle,    cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    error:   { icon: XCircle,        cls: 'border-red-500/30 bg-red-500/10 text-red-300'             },
    warning: { icon: AlertTriangle,  cls: 'border-amber-500/30 bg-amber-500/10 text-amber-300'       },
    info:    { icon: Info,           cls: 'border-sky-500/30 bg-sky-500/10 text-sky-300'             },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const { icon: Icon, cls } = KINDS[toast.kind];

    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md ${cls}`}
            style={{
                animation: toast.exiting
                    ? 'toast-slide-out 0.28s ease-in forwards'
                    : 'toast-slide-in 0.28s ease-out forwards',
            }}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm text-[var(--fg)]">{toast.message}</span>
            <button
                onClick={onDismiss}
                className="shrink-0 rounded-md p-0.5 text-[var(--muted)] transition hover:text-[var(--fg)]"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
