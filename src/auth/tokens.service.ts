/* eslint-disable prettier/prettier */

import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import { JWT_ACCESS_TTL, JWT_REFRESH_TTL } from "src/config/jwt.config"
import { RefreshTokenRepository } from "./refresh-token.repository"
import * as crypto from "crypto"

export type UserRole = 'user' | 'admin';

export type UserProfile = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
};

export type AccessPayload={
    sub:string,
    type:"access",
    profile: UserProfile
}

export type RefreshPayload={
    sub:string,
    type:"refresh",
}

@Injectable()
export class TokenService{
    private readonly accessTokenTtl: string
    private readonly refreshTokenTtl: string

    constructor (
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly refreshTokenRepository: RefreshTokenRepository
    ) {
        this.accessTokenTtl = this.configService.get<string>(JWT_ACCESS_TTL, "15m")
        this.refreshTokenTtl = this.configService.get<string>(JWT_REFRESH_TTL, "7d")
    }
    async generateAccess(profile:UserProfile): Promise<string>{
        return this.jwtService.signAsync({
            sub: profile.id,
            type: "access",
            profile: profile
        },{
            expiresIn: this.accessTokenTtl
        })
    }

    async generateRefresh(userId:string, ipAddress?: string):Promise<string>{
        const token = await this.jwtService.signAsync({
            sub: userId,
            type: "refresh"
        },{
            expiresIn: this.refreshTokenTtl
        });

        // Hash token and persist in database
        const tokenHash = crypto.createHash('sha512').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + this.parseTtlToMs(this.refreshTokenTtl));

        await this.refreshTokenRepository.createToken({
            userId: Number(userId),
            tokenHash,
            expiresAt,
            createdByIp: ipAddress ?? null
        });

        return token;
    }

    async verifyAccess(token:string):Promise<AccessPayload>{
        const payload=await this.jwtService.verifyAsync<AccessPayload>(token);
        if(payload.type!=="access"){
            throw new Error("Invalid token type");
        }
        return payload;
    }
    async verifyRefresh(token:string):Promise<RefreshPayload>{
        const payload=await this.jwtService.verifyAsync<RefreshPayload>(token);
        if(payload.type!=="refresh"){
            throw new Error("Invalid token type");
        }

        // Verify token is not revoked in database
        const tokenHash = crypto.createHash('sha512').update(token).digest('hex');
        const record = await this.refreshTokenRepository.findByTokenHash(tokenHash);

        if (!record) {
            throw new Error("Token has been revoked or does not exist");
        }

        return payload;
    }

    async revokeRefreshToken(token: string, reason?: string): Promise<void> {
        const tokenHash = crypto.createHash('sha512').update(token).digest('hex');
        await this.refreshTokenRepository.revokeToken(tokenHash, reason);
    }

    async revokeAllUserTokens(userId: number, reason?: string): Promise<void> {
        await this.refreshTokenRepository.revokeAllUserTokens(userId, reason);
    }

    private parseTtlToMs(ttl: string): number {
        const match = ttl.match(/^(\d+)([smhd])$/);
        if (!match) return 15 * 60 * 1000; // default 15 minutes

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 15 * 60 * 1000;
        }
    }
}
