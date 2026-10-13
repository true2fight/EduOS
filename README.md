# EduOS

EduOS is a browser-based educational simulator of a desktop operating system. It is designed to help students in grades 5–11 practice working with a desktop, files, applications, and command-line tools in a safe virtual environment.

The interface is in Ukrainian. The project is a static client-side web application: it has no backend, account service, or build step. It uses HTML, CSS, and native JavaScript modules, with IndexedDB/browser storage for local state. JSZip and jsPDF are bundled under `libs/` for archive and PDF features.

## Run locally

You need a modern browser and a local static HTTP server. Serve the project directory over HTTP because the app uses JavaScript modules, browser storage, and a service worker; opening `index.html` directly as a `file://` URL may prevent these features from working correctly. Choose any option below that matches software already available on your computer.

From the project root, start Python's built-in server:

```powershell
python -m http.server 8000
```

If your Windows installation uses the Python launcher, use:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000> in your browser. Stop the server with `Ctrl+C` in the terminal.

### If Python is not installed

**Node.js and npm:** From the project root, run:

```powershell
npx --yes http-server . -p 8000
```

The first run may download the small `http-server` utility through npm. When it prints the local address, open <http://localhost:8000>. Stop it with `Ctrl+C`.

**Visual Studio Code:** Install the **Live Server** extension, open this project folder, right-click `index.html`, and choose **Open with Live Server**. It will open the site at a local address (usually `http://127.0.0.1:5500`).

**PHP:** If PHP is installed, open a terminal in the project root and run:

```powershell
php -S localhost:8000
```

Then open <http://localhost:8000> and stop the server with `Ctrl+C` when finished.

There is no project dependency installation, `package.json`, compilation, or separate development server configuration. The `npx` option only downloads a temporary static server if it is not already cached.

## Using the simulator

Enter a name and grade on the welcome screen to create or select a local learner profile. The simulated desktop provides apps such as File Explorer, Notepad, Paint, an archive manager, settings, and CMD/Bash terminals. The learning app loads task packages from `tasks/`; the catalog currently includes desktop basics and file operations (grades 5–6), archives (grade 7), command-line basics (grade 8), and permissions/settings (grade 9).

Files and operating-system behavior inside the simulator are virtual. Profiles, progress, and other saved state are kept in browser storage on the current device and browser; clearing site data can remove them. The app registers a service worker and is designed to cache its static assets for offline use after it has first been served successfully.

## Project layout

- `index.html` — application entry point and desktop shell
- `css/` — interface styles
- `js/core/` — application startup, storage, profiles, virtual filesystem, and window management
- `js/apps/` — simulated desktop applications and terminals
- `js/learning/` — task catalog, validation, scoring, progress, and certificates
- `tasks/` — task catalog and grade-specific task packages
- `assets/` — icons and wallpapers
- `libs/` — bundled third-party browser libraries
- `manifest.json`, `sw.js` — installable web app metadata and service-worker caching
- `TECHNICAL_SPECIFICATION.md` — detailed project specification

## Deployment

The same static files can be hosted by any static web host, including GitHub Pages. Publish the project contents while preserving the directory structure. For service-worker and offline behavior, use HTTPS (or `localhost` during development).
