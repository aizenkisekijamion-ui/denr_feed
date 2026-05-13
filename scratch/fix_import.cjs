const fs = require('fs');
const path = 'src/components/FeoShapefileMap.jsx';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);
// Line 1100 (index 1099)
lines[1099] = lines[1099].replace(/const newDocRef = doc\(collection\(db, 'feo_poly.*batch.set\(newDocRef, \{/, "                                                             const newDocRef = doc(collection(db, 'feo_polygons')); batch.set(newDocRef, {");
// Line 1110 (index 1109)
lines[1109] = lines[1109].replace(/\}\);\s+\}\);/, "                                                             });");
fs.writeFileSync(path, lines.join('\n'));
console.log('Fixed lines 1100 and 1110');
