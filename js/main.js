// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Baalsamic v20: Core systems online.');

    // Verify JS connection by updating the status text
    const statusSpan = document.getElementById('system-status');
    if (statusSpan) {
        statusSpan.textContent = "Ready";
        statusSpan.style.color = "#27ae60"; // Change to green
    }

    // Attach event listener to the test button
    const testBtn = document.getElementById('test-btn');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            alert('Interaction Successful: JavaScript is fully connected.');
            console.log('User triggered test interaction.');
        });
    }
});

// END OF DOCUMENT [251221-0858]