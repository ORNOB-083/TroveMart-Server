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

export async function verifyFacebookToken(accessToken: string): Promise<OAuthProfile> {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) throw new Error('Facebook app credentials are not defined in .env');

    // Confirm the token was actually issued to our app, not a forged one
    const appToken = `${appId}|${appSecret}`;
    const debugRes = await fetch(
        `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${appToken}`
    );
    const debugData = await debugRes.json();

    if (!debugData?.data?.is_valid || debugData.data.app_id !== appId) {
        throw new Error('Invalid Facebook token.');
    }

    const meRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );
    const me = await meRes.json();

    if (!me.email) {
        throw new Error('Your Facebook account has no email. Please use another sign-in method.');
    }

    return { email: me.email, name: me.name, image: me.picture?.data?.url };
}