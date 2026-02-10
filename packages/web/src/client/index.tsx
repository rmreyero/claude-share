import { createRoot } from "react-dom/client";
import { SessionViewer } from "./components/SessionViewer.js";

const rootEl = document.getElementById("root")!;
const shareId = rootEl.dataset.shareId!;
const apiBase = rootEl.dataset.apiBase ?? "";

createRoot(rootEl).render(<SessionViewer shareId={shareId} apiBase={apiBase} />);
