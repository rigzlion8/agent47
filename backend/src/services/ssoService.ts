import axios from 'axios';
import { User } from '../models/User';

export interface SSOUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export class SSOService {
  // GitHub OAuth
  async getGitHubUserInfo(accessToken: string): Promise<SSOUserInfo> {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      const primaryEmail = emailResponse.data.find((email: any) => email.primary)?.email;

      return {
        id: response.data.id.toString(),
        email: primaryEmail || response.data.email,
        name: response.data.name || response.data.login,
        avatar: response.data.avatar_url
      };
    } catch (error) {
      console.error('GitHub SSO error:', error);
      throw new Error('Failed to get GitHub user info');
    }
  }

  // Google OAuth
  async getGoogleUserInfo(accessToken: string): Promise<SSOUserInfo> {
    try {
      const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      return {
        id: response.data.sub,
        email: response.data.email,
        name: response.data.name,
        avatar: response.data.picture
      };
    } catch (error) {
      console.error('Google SSO error:', error);
      throw new Error('Failed to get Google user info');
    }
  }

  async findOrCreateSSOUser(userInfo: SSOUserInfo, provider: 'github' | 'google') {
    // Look for existing user with this SSO
    let user = await User.findOne({
      ssoProvider: provider,
      ssoId: userInfo.id
    });

    if (user) {
      // Update user info if needed
      user.lastLogin = new Date();
      if (userInfo.avatar && !user.avatar) {
        user.avatar = userInfo.avatar;
      }
      await user.save();
      return user;
    }

    // Look for user with same email
    user = await User.findOne({ email: userInfo.email });
    if (user) {
      // Link SSO to existing account
      user.ssoProvider = provider;
      user.ssoId = userInfo.id;
      user.lastLogin = new Date();
      if (userInfo.avatar) {
        user.avatar = userInfo.avatar;
      }
      await user.save();
      return user;
    }

    // Create new user
    user = new User({
      email: userInfo.email,
      name: userInfo.name,
      ssoProvider: provider,
      ssoId: userInfo.id,
      avatar: userInfo.avatar,
      subscription: 'free',
      usageLimit: 1000,
      lastLogin: new Date()
    });

    await user.save();
    return user;
  }
}