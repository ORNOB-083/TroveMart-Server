import { OAuth2Client } from 'google-auth-library';

interface OAuthProfile {
    email: string;
    name: string;
    image?: string;
}

export async function verifyGoogleToken(idToken: string): Promise<OAuthProfile> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not defined in .env');

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
        throw new Error('Invalid Google token.');
    }

    return {
        email: payload.email,
        name: payload.name || payload.email,
        image: payload.picture,
    };
}

export async function exchangeFacebookCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) throw new Error('Facebook app credentials are not defined in .env');

    const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
        throw new Error(tokenData.error?.message || 'Failed to complete Facebook sign-in.');
    }

    const meRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${tokenData.access_token}`
    );
    const me = await meRes.json();

    if (!me.email) {
        throw new Error('Your Facebook account has no email. Please use another sign-in method.');
    }

    return { email: me.email, name: me.name, image: me.picture?.data?.url };
}