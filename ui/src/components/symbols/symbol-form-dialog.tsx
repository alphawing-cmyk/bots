import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export type SymbolFormValues = {
  symbol: string;
  name?: string;
  exchange?: string;
  asset_class?: string;
  enabled?: boolean;
};

export function SymbolFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (v: SymbolFormValues) => Promise<void> | void;
  initial?: {
    symbol?: string;
    name?: string | null;
    exchange?: string | null;
    asset_class?: string | null;
    enabled?: boolean | null;
  };
}) {
  const form = useForm<SymbolFormValues>({
    defaultValues: {
      symbol: initial?.symbol ?? "",
      name: initial?.name ?? "",
      exchange: initial?.exchange ?? "",
      asset_class: initial?.asset_class ?? "",
      enabled: initial?.enabled ?? true,
    },
  });

  React.useEffect(() => {
    form.reset({
      symbol: initial?.symbol ?? "",
      name: initial?.name ?? "",
      exchange: initial?.exchange ?? "",
      asset_class: initial?.asset_class ?? "",
      enabled: initial?.enabled ?? true,
    });
  }, [initial, open]); // reset when dialog opens or selection changes

  const isEdit = !!initial?.symbol;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Symbol" : "New Symbol"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (v) => {
              // normalize ticker
              v.symbol = v.symbol.trim().toUpperCase();
              await onSubmit(v);
            })}
          >
            <FormField
              control={form.control}
              name="symbol"
              rules={{
                required: "Symbol is required",
                validate: (v) =>
                  /^[A-Za-z0-9.\-/_]+$/.test(v.trim()) ||
                  "Invalid symbol format",
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Symbol *</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-xl"
                      placeholder="AAPL"
                      autoCapitalize="characters"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-xl"
                      placeholder="Apple Inc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="exchange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange</FormLabel>
                    <FormControl>
                      <Input
                        className="rounded-xl"
                        placeholder="NASDAQ"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Class</FormLabel>
                    <FormControl>
                      <Input
                        className="rounded-xl"
                        placeholder="equity"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-2xl border p-3">
                  <div>
                    <FormLabel className="text-sm">Enabled</FormLabel>
                    <div className="text-xs text-muted-foreground">
                      Disabled symbols won’t be traded.
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl">
                {isEdit ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
