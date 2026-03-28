# Running AdvanceQR on Windows

## Prerequisites
Make sure **Node.js** (v18+) is installed:
```cmd
node --version
npm --version
```

---

## Step 1 — Install Dependencies
Open **Command Prompt** (`cmd`) in `d:\AdvanceQR` and run:
```cmd
npm install
```
> Only needed once, or when `package.json` changes.

---

## Step 2 — Start the Dev Server
Run the included batch file:
```cmd
run-dev.bat
```

Or manually:
```cmd
set NODE_ENV=development && node_modules\.bin\tsx.cmd server/index.ts
```

> **Why not `npm run dev`?** The dev script uses Linux-style env variable syntax that doesn't work in Windows.

---

## Step 3 — Open in Browser
Once you see:
```
serving on port 5000
```
Go to: **http://localhost:5000**

---

## Step 4 — (Optional) Add a Database
By default, the app runs in **memory-only mode**. To enable persistent storage, add to `.env`:
```
DATABASE_URL=postgresql://user:password@host/dbname
```
Then push the schema:
```cmd
npx drizzle-kit push
```

---

## Stop the Server
Press `Ctrl + C` in the terminal.
