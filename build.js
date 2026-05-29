const fs = require('fs');
const path = require('path');

const acePath = path.join(__dirname, '0.8/ComixTo/acepilot_source.js');
const custPath = path.join(__dirname, '0.8/ComixTo/customizations.js');
const outputPath = path.join(__dirname, '0.8/ComixTo/source.js');

try {
  console.log("Reading acepilot_source.js...");
  const aceContent = fs.readFileSync(acePath, 'utf8');
  
  console.log("Reading customizations.js...");
  const custContent = fs.readFileSync(custPath, 'utf8');
  
  console.log("Merging files...");
  // Concatenate with two newlines in between
  const mergedContent = aceContent + '\n\n' + custContent;
  
  console.log("Writing to source.js...");
  fs.writeFileSync(outputPath, mergedContent, 'utf8');
  console.log("Successfully assembled and refactored ComixTo source.js!");
} catch (err) {
  console.error("Build failed:", err.message);
  process.exit(1);
}
