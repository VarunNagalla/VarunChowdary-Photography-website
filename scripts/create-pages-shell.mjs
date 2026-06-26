import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const publicDir = join(process.cwd(), ".output", "public");
const assetsDir = join(publicDir, "assets");
const assets = await readdir(assetsDir);

const entry = assets.find((asset) => /^index-[\w-]+\.js$/.test(asset));
const styles = assets.find((asset) => /^styles-[\w-]+\.css$/.test(asset));

if (!entry || !styles) {
  throw new Error("Could not find generated index or styles asset for GitHub Pages shell.");
}

const base = "/VarunChowdary-Photography-website/";
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>VC Photography | Personal Photography Portfolio</title>
    <meta
      name="description"
      content="A personal photography portfolio by Varun, sharing moments, places, light, and small details captured through his lens."
    />
    <meta name="author" content="VC Photography" />
    <meta property="og:title" content="VC Photography | Personal Photography Portfolio" />
    <meta
      property="og:description"
      content="A personal photography portfolio by Varun, sharing moments, places, light, and small details captured through his lens."
    />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@300;400;500;600&display=swap"
    />
    <link rel="stylesheet" href="${base}assets/${styles}" />
    <script type="module" crossorigin src="${base}assets/${entry}"></script>
  </head>
  <body></body>
</html>
`;

await writeFile(join(publicDir, ".nojekyll"), "");
await writeFile(join(publicDir, "index.html"), html);
await writeFile(join(publicDir, "404.html"), html);
