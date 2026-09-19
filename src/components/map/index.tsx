import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy } from "react";
import type { Report } from "@/lib/reports";

const PickerMapImpl = lazy(() => import("./PickerMapImpl"));
const ReportsMapImpl = lazy(() => import("./ReportsMapImpl"));

function MapSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

export function PickerMap(props: {
  lat: number;
  lng: number;
  hasPin: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <PickerMapImpl {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export function ReportsMap({ reports }: { reports: Report[] }) {
  return (
    <ClientOnly fallback={<MapSkeleton />}>
      <Suspense fallback={<MapSkeleton />}>
        <ReportsMapImpl reports={reports} />
      </Suspense>
    </ClientOnly>
  );
}
