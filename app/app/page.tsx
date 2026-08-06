import CurrentLocationControl from "../components/CurrentLocationControl";
import GemDropPhotoEnhancer from "../components/GemDropPhotoEnhancer";
import IntegratedAppShell from "../components/IntegratedAppShell";
import LiquidAppNavigation from "../components/LiquidAppNavigation";
import MobileResultsMode from "../components/MobileResultsMode";
import NotificationCenter from "../components/NotificationCenter";
import PrivacyControls from "../components/PrivacyControls";
import UiSoundController from "../components/UiSoundController";
import VisitFeedback from "../components/VisitFeedback";

export default function GemGoApplicationPage() {
  return (
    <>
      <IntegratedAppShell />
      <CurrentLocationControl />
      <GemDropPhotoEnhancer />
      <LiquidAppNavigation />
      <NotificationCenter />
      <MobileResultsMode />
      <PrivacyControls />
      <UiSoundController />
      <VisitFeedback />
    </>
  );
}
