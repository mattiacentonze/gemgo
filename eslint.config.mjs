import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "app/components/CurrentLocationControl.tsx",
      "app/components/FeedbackImpactMetric.tsx",
      "app/components/GemDropPhotoEnhancer.tsx",
      "app/components/IntegratedAppShell.tsx",
      "app/components/LiquidAppNavigation.tsx",
      "app/components/MobileResultsMode.tsx",
      "app/components/MultiDayTripPlanner.tsx",
      "app/components/NotificationCenter.tsx",
      "app/components/PrivacyControls.tsx",
      "app/components/UiSoundController.tsx",
      "app/components/UndoActionController.tsx",
      "app/components/VisitFeedback.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["app/components/ExperienceMap.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
