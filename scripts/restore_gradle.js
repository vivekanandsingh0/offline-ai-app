const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '../android/app/build.gradle');
let content = fs.readFileSync(gradlePath, 'utf8');

if (content.includes('bundleInDebug = true')) {
    const searchString = 'bundleInDebug = true\n    ';
    content = content.replace(searchString, '');
    fs.writeFileSync(gradlePath, content);
    console.log('Successfully reverted bundleInDebug');
} else {
    console.log('bundleInDebug not found');
}
