# TaskFlow

TaskFlow is a lightweight project and task management platform for small teams.

## Local development

You need Node.js and npm installed locally.

```sh
git clone <repository-url>
cd taskflow
npm i
npm run dev
```

## cPanel deployment

1. Delete any previous `dist` folder.
2. Run `npm install`, then `npx vite build` locally.
3. Confirm the build root contains `index.html`, `assets/`, `.htaccess`, `_redirects`, `favicon.ico`, and `robots.txt`.
4. Upload the **contents** of `dist` to the domain's `public_html` directory.
5. In cPanel File Manager, enable **Show Hidden Files** and confirm `.htaccess` uploaded beside `index.html`.

The `dist` folder is a browser-only static website. It does not contain a `server` folder or server runtime files. Apache fallback routing keeps direct links and page refreshes working after login. Deploy at a domain or subdomain root, not inside a URL subfolder.

The uploaded `public_html` layout should look like this:

```text
public_html/
├── assets/
├── .htaccess
├── _redirects
├── favicon.ico
├── index.html
└── robots.txt
```

## Built with

- Vite
- TypeScript
- React
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Apache-compatible static hosting