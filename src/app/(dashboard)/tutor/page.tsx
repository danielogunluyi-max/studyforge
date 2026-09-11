import TutorWorkspace from "./_tutor-workspace";
import { parseTutorMode } from "~/lib/tutor-mode";

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const mode = parseTutorMode(params.mode);
  const embed = params.embed === "1";

  return <TutorWorkspace initialMode={mode} embed={embed} />;
}
