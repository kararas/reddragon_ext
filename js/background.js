{
  "manifest_version": 3,
  "name": "[proto60] PWA+EXT Silent Printing",
  "version": "1.6.1",
  "description": "[proto60] PWA+EXT Silent Printing",
  "permissions": [
    "printing",
    "tabs"
  ],
  "icons": {
    "16": "icons/red16.png",
    "48": "icons/red48.png",
    "128": "icons/red128.png"
  },
  "background": {
    "service_worker": "js/background.js"
  },
  "externally_connectable": {
    "matches": [
      "https://print.cloudworker.solutions/index.html"
    ]
  },
  "content_scripts": [
    {
      "matches": [
        "https://print.cloudworker.solutions/*"
      ],
      "js": [
        "content.js"
      ]
    }
  ],
  "host_permissions": [
    "https://print.cloudworker.solutions/*"
  ]
}
