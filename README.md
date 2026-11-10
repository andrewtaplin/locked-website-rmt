# Locked

A static website for **Locked**, a student planner prototype for Miami students: Canvas deadlines, syllabi, and a calmer daily plan.

- Live site: https://andrewtaplin.github.io/locked-website-rmt/
- Figma prototype: [Locked](https://www.figma.com/proto/B21PHznMwld5ZEyW2LsXv1/Untitled?node-id=2-3&t=d0NywBDjcpRNaD2P-1)

The site is plain HTML, CSS, and vanilla JavaScript. There is no build step.

## Open locally

```bash
python3 -m http.server 8080
```

Visit http://127.0.0.1:8080/

You can also open `index.html` directly in a browser. A local server is more reliable for fonts and assets.

## What’s in the site

- Landing page: hero, today’s-plan preview, features, how it works, about the project (eight tabs), and footer
- In-page nav and “See how it works” links
- **Try Demo**, **Try the planner**, and **Open functional demo** open the planner
- Planner screens: Today, Calendar (month and agenda), Tasks, Files & Syllabi, Check-in, Integrations (.ics import and Canvas calendar feed sync), Pilot Feedback, and Settings
- Items, uploads, check-ins, and settings are stored in this browser with `localStorage`
- **Continue with Canvas** stays pending until campus OAuth is approved; the University of Miami Canvas link is available now
- **Connect your Canvas calendar feed** syncs through a Cloudflare Worker relay (`worker/`). `LOCKED_CONFIG.canvasRelayUrl` is empty until that worker is deployed; until then, use .ics upload

See `worker/README.md` for how to deploy the relay.
