import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export type StrategyFormValues = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  interval_seconds: number;
  symbols: string[];
  paramsJson: string; // JSON string in the form
  params?: Record<any, any>;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  initialValues?: StrategyFormValues;
  onSubmit: (values: StrategyFormValues) => Promise<void> | void;
  symbolOptions?: string[];
};

const makeDefaults = (): StrategyFormValues => {
  const id = uuidv4();

  return {
    id,
    name: "",
    type: "sma_cross",
    enabled: false,
    interval_seconds: 60,
    symbols: ["AAPL"],
    paramsJson: JSON.stringify(
      {
        fast: 10,
        slow: 30,
        qty: 1,
        stop_loss_pct: 0.01,
        take_profit_pct: 0.02,
        strategy_id: id,
      },
      null,
      2,
    ),
  };
};

function safeJsonParse(
  s: string,
): { ok: true; value: any } | { ok: false; error: string } {
  try {
    const v = JSON.parse(s || "{}");
    if (v === null || typeof v !== "object" || Array.isArray(v)) {
      return {
        ok: false,
        error: 'Params must be a JSON object (e.g. { "fast": 10 }).',
      };
    }
    return { ok: true, value: v };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Invalid JSON" };
  }
}

function normalizeSymbol(s: string) {
  return (s || "").trim().toUpperCase();
}

/* ---------------- Small components ---------------- */

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {error}
    </div>
  );
}

function BasicFields({
  values,
  setValues,
}: {
  values: StrategyFormValues;
  setValues: React.Dispatch<React.SetStateAction<StrategyFormValues>>;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => setValues((p) => ({ ...p, name: e.target.value }))}
          placeholder="My SMA Cross"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Input
          id="type"
          value={values.type}
          onChange={(e) => setValues((p) => ({ ...p, type: e.target.value }))}
          placeholder="sma_cross"
          className="rounded-xl"
        />
        <p className="text-xs text-muted-foreground">
          Must match a backend registry key (e.g.{" "}
          <span className="font-mono">sma_cross</span>).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="interval">Interval (seconds)</Label>
        <Input
          id="interval"
          type="number"
          min={5}
          value={values.interval_seconds}
          onChange={(e) =>
            setValues((p) => ({
              ...p,
              interval_seconds: Number(e.target.value),
            }))
          }
          className="rounded-xl"
        />
      </div>

      <div className="flex items-end justify-between gap-3 rounded-xl border p-3">
        <div>
          <div className="text-sm font-medium">Enabled</div>
          <div className="text-xs text-muted-foreground">
            If enabled, the worker will run it on schedule.
          </div>
        </div>
        <Switch
          checked={values.enabled}
          onCheckedChange={(v) => setValues((p) => ({ ...p, enabled: v }))}
        />
      </div>
    </>
  );
}

function SymbolsMultiSelect({
  selectedSymbols,
  options,
  symbolsOpen,
  setSymbolsOpen,
  symbolsQuery,
  setSymbolsQuery,
  onToggle,
  onRemove,
  onClear,
  onAddCustomFromQuery,
}: {
  selectedSymbols: string[];
  options: string[];
  symbolsOpen: boolean;
  setSymbolsOpen: (v: boolean) => void;
  symbolsQuery: string;
  setSymbolsQuery: (v: string) => void;
  onToggle: (sym: string) => void;
  onRemove: (sym: string) => void;
  onClear: () => void;
  onAddCustomFromQuery: () => void;
}) {
  return (
    <div className="md:col-span-2 space-y-2">
      <Label>Symbols</Label>

      <Popover open={symbolsOpen} onOpenChange={setSymbolsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-auto min-h-10 w-full justify-between rounded-xl px-3 py-2",
              "bg-background",
              selectedSymbols.length
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {selectedSymbols.length ? (
                selectedSymbols.map((s) => (
                  <Badge
                    key={s}
                    variant="secondary"
                    className="rounded-lg px-2 py-1 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(s);
                    }}
                  >
                    {normalizeSymbol(s)}
                    <X className="ml-1 h-3 w-3 opacity-70" />
                  </Badge>
                ))
              ) : (
                <span>Select symbols…</span>
              )}
            </div>

            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[min(520px,calc(100vw-2rem))] p-0"
          align="start"
        >
          <Command shouldFilter>
            <CommandInput
              placeholder="Search symbols… (type to filter or add new)"
              value={symbolsQuery}
              onValueChange={setSymbolsQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddCustomFromQuery();
                }
              }}
            />

            <CommandEmpty>
              <div className="px-3 py-2 text-sm">
                No matches. Press <span className="font-medium">Enter</span> to
                add{" "}
                <span className="font-mono">
                  {normalizeSymbol(symbolsQuery)}
                </span>
                .
              </div>
            </CommandEmpty>

            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((sym) => {
                const isSelected = selectedSymbols.some(
                  (s) => normalizeSymbol(s) === sym,
                );

                return (
                  <CommandItem
                    key={sym}
                    value={sym}
                    onSelect={() => onToggle(sym)}
                    className="cursor-pointer"
                  >
                    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded border">
                      {isSelected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="font-mono text-sm">{sym}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <div className="flex items-center justify-between gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 rounded-lg"
                onClick={onClear}
                disabled={!selectedSymbols.length}
              >
                Clear
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={onAddCustomFromQuery}
                  disabled={!normalizeSymbol(symbolsQuery)}
                >
                  Add “{normalizeSymbol(symbolsQuery) || "…"}”
                </Button>

                <Button
                  type="button"
                  className="h-9 rounded-lg"
                  onClick={() => setSymbolsOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-muted-foreground">
        Click to select multiple. Search to filter, or type a symbol and press
        Enter to add.
      </p>
    </div>
  );
}

function ParamsJsonField({
  paramsJson,
  onChange,
}: {
  paramsJson: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="md:col-span-2 space-y-2">
      <Label htmlFor="params">Params (JSON)</Label>
      <textarea
        id="params"
        value={paramsJson}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-h-[180px] w-full rounded-2xl border bg-background px-3 py-2",
          "font-mono text-sm outline-none focus:ring-2 focus:ring-ring",
        )}
        spellCheck={false}
      />
      <p className="text-xs text-muted-foreground">
        Must be a JSON object (not an array). This is passed into the strategy.
      </p>
    </div>
  );
}

function FooterActions({
  saving,
  onCancel,
  onSubmit,
}: {
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <Button
        variant="ghost"
        className="rounded-xl"
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </Button>
      <Button className="rounded-xl" onClick={onSubmit} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

/* ---------------- Main dialog ---------------- */

export function StrategyFormDialog({
  open,
  onOpenChange,
  title = "New strategy",
  initialValues,
  onSubmit,
  symbolOptions = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "META", "GOOGL"],
}: Props) {
  const [values, setValues] = React.useState<StrategyFormValues>(
    initialValues ?? makeDefaults(),
  );

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [symbolsOpen, setSymbolsOpen] = React.useState(false);
  const [symbolsQuery, setSymbolsQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    const v = initialValues ?? makeDefaults();
    setValues(v);
    setError(null);
    setSaving(false);
    setSymbolsQuery("");
    setSymbolsOpen(false);
  }, [open, initialValues]);

  const selectedSymbols = values.symbols ?? [];

  const toggleSymbol = (sym: string) => {
    const s = normalizeSymbol(sym);
    if (!s) return;

    setValues((p) => {
      const set = new Set((p.symbols ?? []).map(normalizeSymbol));
      if (set.has(s)) set.delete(s);
      else set.add(s);
      return { ...p, symbols: Array.from(set) };
    });
  };

  const removeSymbol = (sym: string) => {
    const s = normalizeSymbol(sym);
    setValues((p) => ({
      ...p,
      symbols: (p.symbols ?? []).filter((x) => normalizeSymbol(x) !== s),
    }));
  };

  const addCustomFromQuery = () => {
    const s = normalizeSymbol(symbolsQuery);
    if (!s) return;
    toggleSymbol(s);
    setSymbolsQuery("");
  };

  const submit = async () => {
    setError(null);

    if (!values.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!values.type.trim()) {
      setError("Type is required (e.g. sma_cross).");
      return;
    }
    if (
      !Number.isFinite(values.interval_seconds) ||
      values.interval_seconds < 5
    ) {
      setError("Interval must be at least 5 seconds.");
      return;
    }
    if (!selectedSymbols.length) {
      setError("Please select at least one symbol.");
      return;
    }

    const payload: StrategyFormValues = {
      name: values.name.trim(),
      type: values.type.trim(),
      symbols: selectedSymbols.map(normalizeSymbol),
      params: JSON.parse(values.paramsJson),
      paramsJson: values.paramsJson,
      id: values.id,
      enabled: values.enabled,
      interval_seconds: values.interval_seconds,
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  const options = React.useMemo(() => {
    const uniq = new Set<string>();
    for (const s of symbolOptions) {
      const n = normalizeSymbol(s);
      if (n) uniq.add(n);
    }
    return Array.from(uniq).sort();
  }, [symbolOptions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "min-w-2xl rounded-2xl",
          "max-h-[600px] p-0", // <-- cap height + let us control padding inside
          "flex flex-col overflow-hidden", // <-- enables internal scroll area
        )}
      >
        {/* Header (fixed) */}
        <div className="border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div
          className={cn(
            "flex-1 overflow-y-auto px-6 py-4",
            "scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent",
            "hover:scrollbar-thumb-muted-foreground/50",
          )}
        >
          <ErrorBanner error={error} />

          <div className="grid gap-4 md:grid-cols-2">
            <BasicFields values={values} setValues={setValues} />

            <SymbolsMultiSelect
              selectedSymbols={selectedSymbols}
              options={options}
              symbolsOpen={symbolsOpen}
              setSymbolsOpen={setSymbolsOpen}
              symbolsQuery={symbolsQuery}
              setSymbolsQuery={setSymbolsQuery}
              onToggle={toggleSymbol}
              onRemove={removeSymbol}
              onClear={() => setValues((p) => ({ ...p, symbols: [] }))}
              onAddCustomFromQuery={addCustomFromQuery}
            />

            <StrategyIdField
              paramsJson={values.paramsJson}
              disabled={saving}
              onChange={(next) =>
                setValues((p) => ({ ...p, paramsJson: next }))
              }
              strategyId={values.id}
            />

            <ParamsJsonField
              paramsJson={values.paramsJson}
              onChange={(v) => setValues((p) => ({ ...p, paramsJson: v }))}
            />
          </div>
        </div>

        {/* Footer (fixed) */}
        <div className="border-t bg-background/80 px-6 py-4 backdrop-blur">
          <FooterActions
            saving={saving}
            onCancel={() => onOpenChange(false)}
            onSubmit={submit}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StrategyIdField({
  paramsJson,
  onChange,
  disabled,
  strategyId,
}: {
  paramsJson: string;
  onChange: (nextParamsJson: string) => void;
  disabled?: boolean;
  strategyId: string;
}) {
  const parsed = React.useMemo(() => safeJsonParse(paramsJson), [paramsJson]);

  const jsonId =
    parsed.ok && typeof parsed.value?.strategy_id === "string"
      ? parsed.value.strategy_id.trim()
      : "";

  const displayId = jsonId || strategyId;

  const setStrategyId = (nextId: string) => {
    const base = parsed.ok ? parsed.value : {};
    const nextObj = { ...base, strategy_id: nextId };
    onChange(JSON.stringify(nextObj, null, 2));
  };

  React.useEffect(() => {
    if (jsonId) return;
    setStrategyId(strategyId || uuidv4());
  }, [jsonId, strategyId]); 

  return (
    <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-xl border p-3">
      <div>
        <div className="text-sm font-medium">Strategy ID</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          Stored in <span className="font-mono">params.strategy_id</span>
        </div>
        <div className="mt-2 font-mono text-xs break-all">
          {displayId || "—"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg"
          disabled={disabled}
          onClick={() => displayId && navigator.clipboard?.writeText(displayId)}
        >
          Copy
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-lg"
          disabled={disabled}
          onClick={() => setStrategyId(uuidv4())}
          title="Generate a new strategy_id"
        >
          Regenerate
        </Button>
      </div>
    </div>
  );
}
