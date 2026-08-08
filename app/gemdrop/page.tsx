import { redirect } from "next/navigation";

export default function GemDropRedirect() {
  redirect("/app/my-trip?gemdrop=1");
}
