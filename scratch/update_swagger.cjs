const fs = require('fs');
let content = fs.readFileSync('swagger.yaml', 'utf8');

// Update enums
content = content.replace(/enum: \["Bangla", "English"\]/g, 'enum: ["Bangla", "English", "Hindi"]');

// Check and remove totalDuration from UpdateCourse schema if it exists
if (content.includes('totalDuration:')) {
    // we need to see where it is
    console.log("totalDuration found in swagger!");
}

fs.writeFileSync('swagger.yaml', content, 'utf8');
console.log("Done");
