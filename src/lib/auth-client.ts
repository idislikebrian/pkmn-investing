"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client bound to the app's own /api/auth route handler.
 * No baseURL needed when used from the same origin (the default here).
 */
export const authClient = createAuthClient();
