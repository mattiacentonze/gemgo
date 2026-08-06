import CurrentLocationControl from "../components/CurrentLocationControl";
import GemDropPhotoEnhancer from "../components/GemDropPhotoEnhancer";
import IntegratedAppShell from "../components/IntegratedAppShell";
import LiquidAppNavigation from "../components/LiquidAppNavigation";
import MobileResultsMode from "../components/MobileResultsMode";
import ModalExperienceEnhancer from "../components/ModalExperienceEnhancer";
import NotificationCenter from "../components/NotificationCenter";
import PrivacyControls from "../components/PrivacyControls";
import UiSoundController from "../components/UiSoundController";
import UndoActionController from "../components/UndoActionController";
import VisitFeedback from "../components/VisitFeedback";

export default function GemGoApplicationPage() {
  return (
    <>
      <IntegratedAppShell />
      <CurrentLocationControl />
      <GemDropPhotoEnhancer />
      <LiquidAppNavigation />
      <MobileResultsMode />
      <ModalExperienceEnhancer />
      <NotificationCenter />
      <PrivacyControls />
      <UiSoundController />
      <UndoActionController />
      <VisitFeedback />
    </>
  );
}
