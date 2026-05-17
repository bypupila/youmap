import fs from "fs";
import path from "path";

const srcDir = "/Users/bypupila/.gemini/antigravity/brain/ac9d1317-d547-40ac-b988-d1e02348e44b";
const destCreatorsDir = "./public/creators";

const filesToCopy = [
  { src: "drew_binsky_avatar_1779057496237.png", dest: "drew-binsky.png" },
  { src: "alan_por_el_mundo_avatar_1779058080071.png", dest: "alan-por-el-mundo.png" },
  { src: "misias_pero_viajeras_avatar_1779058112573.png", dest: "misias-pero-viajeras.png" },
  { src: "final_cta_map_mockup_1779058158629.png", dest: "final-cta-map-mockup.png" }
];

console.log("--------------------------------------------------");
console.log("TravelYourMap: Copying premium generated assets...");
console.log(`Source directory: ${srcDir}`);
console.log(`Destination: ${destCreatorsDir}`);
console.log("--------------------------------------------------");

if (!fs.existsSync(destCreatorsDir)) {
  fs.mkdirSync(destCreatorsDir, { recursive: true });
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
