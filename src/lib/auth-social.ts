import { toast } from "sonner";

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";

/**
 * Initiates Google OAuth 2.0 Login Flow
 */
export function initiateGoogleOAuth() {
  if (!GOOGLE_CLIENT_ID) {
    toast.info("VITE_GOOGLE_CLIENT_ID not found in .env. Running local Google OAuth simulation.");
    return null;
  }

  const redirectUri = `${window.location.origin}`;
  const scope = "email profile";
  const responseType = "token";

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    GOOGLE_CLIENT_ID,
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scope,
  )}&response_type=${responseType}`;

  window.location.href = googleAuthUrl;
}

/**
 * Initiates Facebook OAuth Login Flow
 */
export function initiateFacebookOAuth() {
  if (!FACEBOOK_APP_ID) {
    toast.info("VITE_FACEBOOK_APP_ID not found in .env. Running local Facebook OAuth simulation.");
    return null;
  }

  const redirectUri = `${window.location.origin}/login`;
  const scope = "email,public_profile";

  const facebookAuthUrl = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${encodeURIComponent(
    FACEBOOK_APP_ID,
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scope,
  )}&response_type=token`;

  window.location.href = facebookAuthUrl;
}
