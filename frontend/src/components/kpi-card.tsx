import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KpiCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string | number;
  isLoading?: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <span className="text-2xl font-semibold">{value}</span>
        )}
      </CardContent>
    </Card>
  );
}
