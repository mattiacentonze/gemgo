import { LoaderCircle, MapPin } from "lucide-react";

export default function LoadingScreen() {
  return (
    <main className="route-loading" role="status" aria-live="polite">
      <div className="route-loading-mark">
        <MapPin size={34} />
        <LoaderCircle className="route-loading-spinner" size={62} />
      </div>
      <strong>GemGo</strong>
      <span>Preparing a quieter Alpine route…</span>
      <div className="route-loading-track" aria-hidden="true">
        <i />
      </div>
    </main>
  );
}
