"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSOService = void 0;
const axios_1 = __importDefault(require("axios"));
const User_1 = require("../models/User");
class SSOService {
    async getGitHubUserInfo(accessToken) {
        try {
            const response = await axios_1.default.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            const emailResponse = await axios_1.default.get('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            const primaryEmail = emailResponse.data.find((email) => email.primary)?.email;
            return {
                id: response.data.id.toString(),
                email: primaryEmail || response.data.email,
                name: response.data.name || response.data.login,
                avatar: response.data.avatar_url
            };
        }
        catch (error) {
            console.error('GitHub SSO error:', error);
            throw new Error('Failed to get GitHub user info');
        }
    }
    async getGoogleUserInfo(accessToken) {
        try {
            const response = await axios_1.default.get('https://www.googleapis.com/oauth2/v3/userinfo', {
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
        }
        catch (error) {
            console.error('Google SSO error:', error);
            throw new Error('Failed to get Google user info');
        }
    }
    async findOrCreateSSOUser(userInfo, provider) {
        let user = await User_1.User.findOne({
            ssoProvider: provider,
            ssoId: userInfo.id
        });
        if (user) {
            user.lastLogin = new Date();
            if (userInfo.avatar && !user.avatar) {
                user.avatar = userInfo.avatar;
            }
            await user.save();
            return user;
        }
        user = await User_1.User.findOne({ email: userInfo.email });
        if (user) {
            user.ssoProvider = provider;
            user.ssoId = userInfo.id;
            user.lastLogin = new Date();
            if (userInfo.avatar) {
                user.avatar = userInfo.avatar;
            }
            await user.save();
            return user;
        }
        user = new User_1.User({
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
exports.SSOService = SSOService;
