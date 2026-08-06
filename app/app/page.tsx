import CurrentLocationControl from "../components/CurrentLocationControl";
import IntegratedAppShell from "../components/IntegratedAppShell";
import MobileResultsMode from "../components/MobileResultsMode";
import NotificationCenter from "../components/NotificationCenter";
import PrivacyControls from "../components/PrivacyControls";
import VisitFeedback from "../components/VisitFeedback";

export default function GemGoApplicationPage() {
  return (
    <>
      <IntegratedAppShell />
      <CurrentLocationControl />
      <NotificationCenter />
      <MobileResultsMode />
      <PrivacyControls />
      <VisitFeedback />
    </>
  );
}
