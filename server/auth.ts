import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage.js";
import { User as SelectUser } from "../shared/schema.js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key-here-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ── Local Strategy ───────────────────────────────────────────────────────────
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // ── Google OAuth Strategy ────────────────────────────────────────────────────
  const googleOAuthConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleOAuthConfigured) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId!,
          clientSecret: googleClientSecret!,
          callbackURL: "/auth/google/callback",
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: { id: string; displayName?: string; emails?: Array<{ value?: string }> },
          done: (error: Error | null, user?: any) => void,
        ) => {
          try {
            // Use display name or email prefix as username
            const username =
              profile.displayName ||
              (profile.emails?.[0]?.value ?? "").split("@")[0] ||
              `google_${profile.id}`;
            const user = await storage.upsertOAuthUser({
              googleId: profile.id,
              username,
            });
            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        },
      ),
    );
  } else {
    console.warn("[OAuth] Google credentials not set — Google login disabled.");
  }

  // ── GitHub OAuth Strategy ────────────────────────────────────────────────────
  const githubOAuthConfigured = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
  );
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (githubOAuthConfigured) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: githubClientId!,
          clientSecret: githubClientSecret!,
          callbackURL: "/auth/github/callback",
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const username =
              profile.username ||
              profile.displayName ||
              `github_${profile.id}`;
            const user = await storage.upsertOAuthUser({
              githubId: profile.id,
              username,
            });
            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        },
      ),
    );
  } else {
    console.warn("[OAuth] GitHub credentials not set — GitHub login disabled.");
  }

  // ── Serialize / Deserialize ──────────────────────────────────────────────────
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // ── Local auth routes ────────────────────────────────────────────────────────
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ id: user.id, username: user.username });
      });
    } catch (error) {
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json({ id: user.id, username: user.username });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({ id: req.user!.id, username: req.user!.username });
  });

  // ── Google OAuth routes ───────────────────────────────────────────────────────
  if (googleOAuthConfigured) {
    app.get(
      "/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] }),
    );
    app.get(
      "/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/?error=google_auth_failed" }),
      (_req, res) => res.redirect("/dashboard"),
    );
  } else {
    app.get("/auth/google", (_req, res) =>
      res.status(503).json({ message: "Google OAuth is not configured on this server." }),
    );
    app.get("/auth/google/callback", (_req, res) =>
      res.redirect("/?error=google_oauth_not_configured"),
    );
  }

  // ── GitHub OAuth routes ───────────────────────────────────────────────────────
  if (githubOAuthConfigured) {
    app.get(
      "/auth/github",
      passport.authenticate("github", { scope: ["user:email"] }),
    );
    app.get(
      "/auth/github/callback",
      passport.authenticate("github", { failureRedirect: "/?error=github_auth_failed" }),
      (_req, res) => res.redirect("/dashboard"),
    );
  } else {
    app.get("/auth/github", (_req, res) =>
      res.status(503).json({ message: "GitHub OAuth is not configured on this server." }),
    );
    app.get("/auth/github/callback", (_req, res) =>
      res.redirect("/?error=github_oauth_not_configured"),
    );
  }
}