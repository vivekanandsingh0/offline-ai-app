const fs = require('fs');
const path = require('path');

const gradlePath = path.join(__dirname, '../android/app/build.gradle');
let content = fs.readFileSync(gradlePath, 'utf8');

if (!content.includes('bundleInDebug = true')) {
    const searchString = 'enableBundleCompression = (findProperty';
    const replaceString = 'bundleInDebug = true\n    ' + searchString;
    content = content.replace(searchString, replaceString);
    fs.writeFileSync(gradlePath, content);
    console.log('Successfully injected bundleInDebug = true');
} else {
    console.log('bundleInDebug already present');
}
