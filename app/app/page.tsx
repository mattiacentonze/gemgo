import IntegratedAppShell from "../components/IntegratedAppShell";
import MobileResultsMode from "../components/MobileResultsMode";
import NotificationCenter from "../components/NotificationCenter";

export default function GemGoApplicationPage() {
  return (
    <>
      <IntegratedAppShell />
      <NotificationCenter />
      <MobileResultsMode />
    </>
  );
}
