// Maintain a record of the latest status for each job
const jobStatusRecord = {};
let mainPrinterId;
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    if (message.command === 'getPrinters') {
        chrome.printing.getPrinters((printers) => {
            if (chrome.runtime.lastError) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ success: true, printers: printers });
            }
        });
        return true;  // Will respond asynchronously
    } else if (message.command === 'print') {
        this.mainPrinterId = message.printerId;
        console.log("Message within print:", message);
        console.log('Printing to printer ID:', message.printerId);
        console.log('Document URL:', message.pdfUrl);

        const printerId = message.printerId;
        const documentUrl = message.pdfUrl;

        if (!printerId || !documentUrl) {
            sendResponse({ status: "Error: No printerId or PDF data available" });
            return;
        }

        const base64Data = documentUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const submitJobRequest = {
            job: {
                printerId: printerId,
                title: 'My Print Job',
                ticket: {
                    version: '1.0',
                    print: {
                        vendor_ticket_item: [{ id: 'finishings', value: 'trim' }],
                        color: { type: 'STANDARD_MONOCHROME' },
                        duplex: { type: 'NO_DUPLEX' },
                        page_orientation: { type: 'PORTRAIT' },
                        copies: { copies: 1 },
                        dpi: { horizontal_dpi: 300, vertical_dpi: 300 },
                        media_size: {
                            width_microns: 101600,
                            height_microns: 152400
                        },
                        collate: { collate: false }
                    }
                },
                contentType: 'application/pdf',
                document: new Blob([bytes], { type: 'application/pdf' })
            }
        };

        console.log("Submit Job Request:", submitJobRequest);

        chrome.printing.submitJob(submitJobRequest, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error submitting print job:", chrome.runtime.lastError.message);
                sendResponse({ status: "Error: " + chrome.runtime.lastError.message });
            } else if (response) {
                console.log("Print job submitted successfully. Job ID:", response.jobId);
                const printJobOutcome = {
                    printerId: printerId,
                    status: response.status,
                    timestamp: new Date().toLocaleString()
                };
                sendResponse({ status: "Printing started", outcome: printJobOutcome });
            } else {
                console.error("Unknown error submitting print job. Response is undefined.");
                sendResponse({ status: "Error: Unknown error submitting print job" });
            }
        });

        return true; // Keep the message channel open for sendResponse
    }
});

chrome.printing.onJobStatusChanged.addListener((jobId, status) => {
    console.log("Print job status changed:", jobId, "Status:", status);

    if (jobStatusRecord[jobId] !== status) {
        jobStatusRecord[jobId] = status;

        const message = {
            type: 'JOB_STATUS_CHANGED',
            jobId: jobId,
            status: status
        };

        const urlPatterns = [
            'https://print.cloudworker.solutions/index.html'
        ];

        console.log('Attempting to send message to tabs matching URLs:', urlPatterns);

        // const printerId = jobId.split('-')[0];
        console.log("printerId:", this.mainPrinterId);
        chrome.printing.getPrinterInfo(this.mainPrinterId, (printerInfo) => {
            if (chrome.runtime.lastError) {
                console.error('Error fetching printer info:', chrome.runtime.lastError.message);
                message.printerStatus = 'Error fetching printer status';
            } else {
                const status = parsePrinterStatus(printerInfo.status);
                message.printerStatus = status;
            }

            // SIMPLIFY > THIS SHOULD NOT BE NECESSARY
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab) => {
                    if (urlPatterns.includes(tab.url) && tab.active === true) {
                        chrome.tabs.sendMessage(tab.id, message, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error('Error sending message to PWA:', chrome.runtime.lastError.message);
                            } else {
                                console.log('Message sent successfully to PWA:', response);
                            }
                        });
                    }
                });
            });
        });
    }
});

function parsePrinterStatus(printerStateReasons) {
    if (!printerStateReasons || printerStateReasons.length === 0) {
        return 'No issues';
    }

    console.log("Printer state reasons:", printerStateReasons);
    const statusArray = Array.isArray(printerStateReasons) ? printerStateReasons : [printerStateReasons];

    return statusArray.map(status => {
        switch (status) {
            case 'OUT_OF_PAPER':
                return 'Out of Paper';
            case 'OUT_OF_INK':
                return 'Out of Ink';
            case 'PAPER_JAM':
                return 'Paper Jam';
            case 'DOOR_OPEN':
                return 'Door Open';
            case 'UNREACHABLE':
                return 'Unreachable';
            default:
                return 'Printed';
        }
    }).join(', ');
}
