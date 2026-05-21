import fs from "fs";
import path from "path";

const DEFAULT_SRC_DIR = "/Users/bypupila/.gemini/antigravity/brain/ac9d1317-d547-40ac-b988-d1e02348e44b";
const srcDir = process.env.GEMINI_ASSETS_SRC_DIR || DEFAULT_SRC_DIR;
const destCreatorsDir = process.env.GEMINI_ASSETS_DEST_DIR || "./public/creators";

const filesToCopy = [
  { src: "drew_binsky_avatar_1779057496237.png", dest: "drew-binsky.png" },
  { src: "alan_por_el_mundo_avatar_1779058080071.png", dest: "alan-por-el-mundo.png" },
  { src: "misias_pero_viajeras_avatar_1779058112573.png", dest: "misias-pero-viajeras.png" },
  { src: "final_cta_map_mockup_1779058158629.png", dest: "final-cta-map-mockup.png" }
];

function getMissingDestinationFiles() {
  return filesToCopy
    .map((file) => path.join(destCreatorsDir, file.dest))
    .filter((destPath) => !fs.existsSync(destPath));
}

console.log("--------------------------------------------------");
console.log("TravelYourMap: Copying premium generated assets...");
console.log(`Source directory: ${srcDir}`);
console.log(`Destination: ${destCreatorsDir}`);
console.log("--------------------------------------------------");

if (!fs.existsSync(srcDir)) {
  const missingDestinations = getMissingDestinationFiles();

  if (missingDestinations.length === 0) {
    console.warn(`! Source directory does not exist: ${srcDir}`);
    console.warn("! Using existing committed assets in destination directory.");
    console.log("--------------------------------------------------");
    console.log(`Copy assets process skipped. Found ${filesToCopy.length}/${filesToCopy.length} destination files.`);
    console.log("--------------------------------------------------");
    process.exit(0);
  }

  console.error(`⨯ Source directory does not exist: ${srcDir}`);
  console.error("⨯ Missing destination assets:");
  for (const missingDestination of missingDestinations) {
    console.error(`  - ${missingDestination}`);
  }
  process.exit(1);
}

if (!fs.existsSync(destCreatorsDir)) {
  fs.mkdirSync(destCreatorsDir, { recursive: true });
}

const sourceRealPath = fs.realpathSync(srcDir);
const destinationRealPath = fs.realpathSync(destCreatorsDir);

if (sourceRealPath === destinationRealPath) {
  console.error("⨯ Refusing to copy assets because source and destination are the same directory.");
  console.error(`  source: ${sourceRealPath}`);
  console.error(`  destination: ${destinationRealPath}`);
  process.exit(1);
}

let successCount = 0;

for (const file of filesToCopy) {
  const srcPath = path.join(srcDir, file.src);
  const destPath = path.join(destCreatorsDir, file.dest);

  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ Successfully copied ${file.src} to ${destPath}`);
      successCount++;
    } catch (err) {
      console.error(`⨯ Failed to copy ${file.src}:`, err.message);
    }
  } else {
    // If the file with timestamp doesn't exist, check if there's any file matching the prefix
    try {
      const prefix = file.src.split("_177")[0];
      const files = fs.readdirSync(srcDir);
      const match = files.find(f => f.startsWith(prefix) && f.endsWith(".png"));
      if (match) {
        const fullMatchPath = path.join(srcDir, match);
        fs.copyFileSync(fullMatchPath, destPath);
        console.log(`✓ Successfully copied prefix match ${match} to ${destPath}`);
        successCount++;
      } else {
        console.warn(`! Source file not found matching: ${prefix}`);
      }
    } catch (readdirErr) {
      console.warn(`! Source file not found: ${srcPath}`);
    }
  }
}

console.log("--------------------------------------------------");
console.log(`Copy assets process finished. Copied ${successCount}/${filesToCopy.length} files.`);
console.log("--------------------------------------------------");
