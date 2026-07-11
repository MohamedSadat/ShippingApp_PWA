import { copyFileSync } from "node:fs";
import { join } from "node:path";

// GitHub Pages has no server-side rewrite, so it 404s on deep links like
// /agent/scan/pickup on refresh. Serving index.html as 404.html is the
// standard workaround for client-side routers on Pages.
const dist = join(process.cwd(), "dist");
copyFileSync(join(dist, "index.html"), join(dist, "404.html"));
