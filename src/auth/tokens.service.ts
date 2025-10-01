/* eslint-disable prettier/prettier */

import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import { JWT_ACCESS_TTL, JWT_REFRESH_TTL } from "src/config/jwt.config"

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

    constructor (private readonly jwtService: JwtService, private readonly configService: ConfigService) {
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

    async generateRefresh(userId:string):Promise<string>{
        return this.jwtService.signAsync({
            sub: userId,
            type: "refresh"
        },{
            expiresIn: this.refreshTokenTtl
        })
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
        return payload;
    }
}
