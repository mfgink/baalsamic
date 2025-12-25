// v21.14.0 - js/main.js
/*
    BAALSAMIC BOOTLOADER
    Responsibility: Initialize Engines and Handle Startup Errors
*/

document.addEventListener('DOMContentLoaded', () => {
    console.log("BOOT: Baalsamic V21.14 Main Loader Starting...");
    
    // 1. Check for Workflow Engine (The Logic)
    if (window.Workflow) {
        console.log("BOOT: Workflow Object Found. Keys:", Object.keys(window.Workflow));
        
        try {
            if (typeof window.Workflow.init === 'function') {
                window.Workflow.init();
                console.log("BOOT: Workflow Initialized Successfully.");
            } else {
                console.error("BOOT CRASH: 'init' is missing from Workflow object.");
                console.dir(window.Workflow); // Dump object for inspection
                alert("System Error: Workflow Engine is loaded but corrupt (Missing Init).");
            }
        } catch (e) {
            console.error("BOOT CRASH: Workflow.init() threw an error", e);
            alert("System Error: Workflow Engine Crashed during startup.\nCheck console for details.");
        }
    } else {
        console.error("CRITICAL: 'window.Workflow' is undefined.");
        console.warn("Hint: Check js/ui/workflow.js for syntax errors.");
        alert("System Error: Workflow Engine Missing.\n\nThe app cannot start because 'workflow.js' failed to load or parse.");
    }

    // 2. Check for Artist Engine (The Renderer)
    if (window.Artist) {
        console.log("BOOT: Artist Engine Standby");
    } else {
        console.warn("BOOT: Artist Engine not found (Darkroom may be disabled).");
    }
});
// END OF DOCUMENT - js/main.js [20251225-2315]