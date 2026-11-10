# Locked

A static website rebuilt from the **Locked** Figma prototype: a student planner landing page for Miami students (Canvas deadlines, syllabi, and a calmer daily plan).

Figma prototype: [Locked](https://www.figma.com/proto/B21PHznMwld5ZEyW2LsXv1/Untitled?node-id=2-3&t=d0NywBDjcpRNaD2P-1)

The site is plain HTML, CSS, and a little vanilla JavaScript. There is no build step.

## Open locally

From this folder, serve the files with any static server, then open the URL in a browser:

```bash
python3 -m http.server 8080
```

Visit http://127.0.0.1:8080/

You can also open `index.html` directly in a browser. A local server is more reliable for fonts and assets.

## What’s in the site

- Landing page: hero, today’s-plan preview, features, how it works, about the project, and footer
- In-page nav and “See how it works” links
- About-the-project section tabs
- **Try Demo** / **Try the planner** opens a simple planner view based on the landing preview card
- **Continue with Canvas** opens a “Canvas setup pending” dialog
