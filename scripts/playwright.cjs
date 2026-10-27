// Install with npm ci; Edge on Windows, bundled Chromium on other systems.
const {chromium}=require('playwright');
function launchOptions(){return process.platform==='win32'?{channel:'msedge',headless:true}:{headless:true};}
module.exports={chromium,launchOptions};
