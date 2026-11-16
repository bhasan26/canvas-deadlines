# Canvas Deadlines

A Chrome and Edge extension that puts your Canvas assignments in a dashboard sidebar, a scrolling deadline ticker, and a toolbar popup. It uses your existing Canvas sign-in and requires no API key or build step.

## Install

1. On the GitHub repository page, select **Code → Download ZIP** and extract the ZIP.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Turn on **Developer mode** and select **Load unpacked**.
4. Select the extracted folder that contains `manifest.json`. Keep this folder on your computer because the browser loads the extension from it.
5. Sign in to Canvas and open your dashboard. At Whitworth, the sidebar and ticker load automatically. At other schools, open your Canvas tab and click **Canvas Deadlines** in the browser's **Extensions** menu.

You can pin the extension from the **Extensions** menu for quicker access. To try the sample data, open the popup on a regular non-Canvas webpage and select **Explore a demo**. [Chrome installation guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked) · [Edge installation guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading)

## Use the dashboard and popup

- **Ticker:** The bar beside the Dashboard heading scrolls through your nearest unfinished deadlines. Click an assignment to open it in Canvas. Use the pause button, hover, or focus a link to stop the scrolling. The ticker respects reduced-motion settings and hides when the header has limited space.
- **Sidebar:** Expand a day in the three-day workload overview to see what's due. Course progress rings show the number completed out of all loaded assignments for each active course. Use the minus button to collapse the panel.
- **Assignment lists:** In the sidebar or popup, switch between **Upcoming**, **Overdue**, and **Completed**. Filter by course, search by name, or use **Refresh assignments** to fetch the latest data. Undated assignments appear at the end of **Upcoming**.
- **Dates:** The extension uses your device's local time zone. **Due today** includes unfinished work due earlier today.

## Enable the dashboard at another school

The automatic sidebar and ticker are configured for `whitworth.instructure.com`. The toolbar popup works on a signed-in HTTPS Canvas page when the school allows access to its Canvas API.

1. Open `manifest.json` in the extracted folder with a text editor.
2. Under `content_scripts` → `matches`, replace `https://whitworth.instructure.com/*` with your school's exact Canvas host, for example `https://example-school.instructure.com/*`. Keep the `/*` suffix.
3. Save the file, click **Reload** on the extension's card in your browser's extensions page, and refresh your Canvas dashboard. The sidebar and ticker depend on the dashboard layout.

## Privacy and data

The extension uses read-only requests to the Canvas site you're signed into. It displays your assignments in your browser and has no external server, analytics, or persistent assignment storage. The browser grants temporary access to the active tab when you open the toolbar popup. Automatic dashboard access is scoped to the site listed in `manifest.json`.

Canvas data comes from available courses with active student enrollment, including quizzes and graded discussions Canvas represents as assignments. Calendar-only events, planner notes, ungraded discussions, and concluded courses are outside the assignment feed. The completion count follows Canvas submission and grading status. Check Canvas for any instructor feedback or revision requests.

## Troubleshooting and updates

If a refresh fails, sign in to Canvas again and reload your dashboard. Keep the popup open while it loads. If your school blocks an API request, the extension shows which courses failed and calculates counts from the courses it could load.

To update, download and extract the latest source, copy it into your installed extension folder, then reload the extension and refresh Canvas. Reapply your Canvas host in `manifest.json` if you customized it.

## Development

Run the dashboard tests with Node.js and Playwright. The tests use a mock Canvas site and sample assignments.

```sh
npm install --no-save --no-package-lock playwright
npx playwright install chromium
node test-sidebar.cjs
```

An independent project for Canvas LMS.
