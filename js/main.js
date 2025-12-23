// v21.0 - js/main.js
/*
    BAALSAMIC V21 BOOTLOADER
    Initializes the modules and global state.
*/

document.addEventListener('DOMContentLoaded', () => {
    console.log("BOOT: Baalsamic V21 Kernel Loading...");
    
    // Hide Overlay after 1s
    setTimeout(() => {
        document.getElementById("overlay").style.display = "none";
    }, 800);

    // Initialize UI Workflow
    if (window.Workflow) {
        window.Workflow.init();
    } else {
        console.error("CRITICAL: Workflow module missing.");
    }
    
    // Check for Artist Engine
    if (!window.Artist) {
        console.warn("WARN: Artist Engine not loaded. Darkroom will fail.");
    }
});

// Helper for Debugging
window.dbg = function(msg) {
    console.log(`[SYS] ${msg}`);
};
// END OF DOCUMENT - js/main.js