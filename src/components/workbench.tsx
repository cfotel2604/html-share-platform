import { Studio } from "./studio/studio";

// Stable page entry point; presentation and API workflow live in separate modules.
export default function Workbench() {
  return <Studio />;
}
