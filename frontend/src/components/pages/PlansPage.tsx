import { IntervalPlansTable } from "@/components/plans/IntervalPlansTable";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Interval plans"
        description="Every workout the coach has written for you. Open one to see the full session."
      />
      <Card className="p-1.5">
        <IntervalPlansTable />
      </Card>
    </div>
  );
}
