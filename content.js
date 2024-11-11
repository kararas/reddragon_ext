console.log('Content script loaded');

// SIMPLIFY >> THIS CONTENTSCRIPT SHOULD NOT BE REQUIRED

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in content script:', message);
    // Forward the message to the PWA
    window.postMessage(message, '*');
    sendResponse({ success: true });
});

window.addEventListener('message', (event) => {
    const allowedOrigins = [
        'chrome-extension://hfoijoklpjiochoaaocmapdcpgdmlkak', // Replace with your actual published extension ID(Published in Chrome webstore)
        'https://print.cloudworker.solutions/index.html' //hosted url for PWA(Google cloud)
    ];

    if (!allowedOrigins.includes(event.target.location.href)) {
        console.warn('Received message from untrusted origin:', event.origin);
        return; // Only accept messages from the specific extension ID
    }
});
