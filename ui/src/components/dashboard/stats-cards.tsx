import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatsCards({ data }: { data: any }) {
  const items = [
    { label: "Strategies", value: data.strategies_total },
    { label: "Enabled", value: data.strategies_enabled },
    { label: "Runs", value: data.runs_total },
    { label: "Errors", value: data.runs_errors },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((x) => (
        <Card key={x.label} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{x.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{x.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
