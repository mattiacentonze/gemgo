import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("gem contributions use authenticated multipart media processing", async () => {
  const route = await source("app/api/gems/route.ts");

  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /supabase\.auth\.getClaims\(\)/);
  assert.match(route, /request\.formData\(\)/);
  assert.match(route, /multipart\/form-data/);
  assert.match(route, /content-length/);
  assert.match(route, /4 \* 1024 \* 1024/);
  assert.match(route, /MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES \+ 256 \* 1024/);
  assert.match(route, /input\.byteLength > MAX_UPLOAD_BYTES/);
  assert.match(route, /sharp\(input/);
  assert.match(route, /limitInputPixels: MAX_INPUT_PIXELS/);
  assert.match(route, /metadata\.format !== declaredFormat/);
  assert.match(route, /\(metadata\.pages \?\? 1\) > 1/);
  assert.match(route, /\.rotate\(\)/);
  assert.match(route, /\.webp\(/);
  assert.doesNotMatch(route, /\.withMetadata\(/);
  assert.match(route, /createHash\("sha256"\)/);
  assert.match(route, /MIN_LANDSCAPE_RATIO = 1\.22/);
  assert.match(route, /width < 320 \|\| height < 200/);
  assert.match(route, /\[.http:., .https:.\]\.includes\(parsed\.protocol\)/);
  assert.match(route, /\.eq\("author_id", userId\)/);
  assert.match(route, /"submit_gem_suggestion"/);
  assert.match(route, /p_consent_confirmed: true/);
  assert.match(route, /"gem-contributions"/);
  assert.match(route, /contentType: "image\/webp"/);
  assert.match(route, /upsert: false/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SECRET|sb_secret_/);
  assert.doesNotMatch(route, /request\.json\(\)|getDb|GEMGO_SITES_API_BASE_URL/);
});

test("a failed private upload withdraws the pending contribution", async () => {
  const route = await source("app/api/gems/route.ts");
  const uploadFailure = route.slice(route.indexOf("if (uploadError"));

  assert.match(uploadFailure, /\.remove\(\[submission\.object_path\]\)/);
  assert.match(uploadFailure, /"withdraw_gem_suggestion"/);
  assert.match(uploadFailure, /contribution_upload_failed/);
  assert.ok(
    uploadFailure.indexOf("withdraw_gem_suggestion") <
      uploadFailure.indexOf(".remove([submission.object_path])"),
    "withdrawal must precede the RLS-protected object deletion",
  );
});

test("the contribution UI waits for moderation instead of awarding locally", async () => {
  const form = await source("app/components/GemContributionForm.tsx");

  assert.match(form, /fetch\("\/api\/gems"[\s\S]*method: "GET"/);
  assert.match(form, /href="\/app\/profile"/);
  assert.match(form, /new FormData\(formElement\)/);
  assert.match(form, /body: form/);
  assert.match(form, /photo\.size > MAX_PHOTO_BYTES/);
  assert.match(form, /requestIdRef\.current \?\?= crypto\.randomUUID\(\)/);
  assert.match(form, /result\.suggestion\.status !== "pending"/);
  assert.match(form, /70 GemPoints after approval/);
  assert.match(form, /70 GemPoints dopo l’approvazione/);
  assert.match(form, /name="termsAccepted"/);
  assert.doesNotMatch(form, /GemXP/);
  assert.doesNotMatch(form, /result\.reward|reward \?\? 70|onAccepted\s*\(/);
  assert.doesNotMatch(
    form,
    /headers:\s*\{\s*"content-type":\s*"application\/json"/,
  );
});

test("contribution auth, consent and recent states retain usable responsive layout", async () => {
  const styles = await source("app/styles/profile-page.css");

  assert.match(styles, /\.contribution-status\s*\{[^}]*display:flex/);
  assert.match(styles, /\.contribution-auth-required>div\s*\{[^}]*display:grid/);
  assert.match(
    styles,
    /\.contribution-consent\s*\{[^}]*grid-template-columns:20px minmax\(0,1fr\)/,
  );
  assert.match(
    styles,
    /\.contribution-consent input\[type="checkbox"\]\s*\{[^}]*width:18px[^}]*min-height:18px/,
  );
  assert.match(styles, /\.contribution-submissions article\s*\{[^}]*display:flex/);
  assert.match(styles, /\.contribution-state\s*\{[^}]*border-radius:999px/);
  assert.match(
    styles,
    /@media \(max-width:720px\)[\s\S]*\.contribution-submissions article\{[^}]*flex-direction:column/,
  );
});
