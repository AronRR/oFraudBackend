/* eslint-disable prettier/prettier */

import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModuleAsyncOptions } from '@nestjs/jwt';

export const JWT_SECRET = "JWT_SECRET";
export const JWT_ACCESS_TTL = "JWT_ACCESS_TTL";
export const JWT_REFRESH_TTL = "JWT_REFRESH_TTL";

export const jwtConfig: JwtModuleAsyncOptions = {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>(JWT_SECRET),
        signOptions: {
            expiresIn: configService.get<string>(JWT_ACCESS_TTL, "15m"),
        },
    }),
};
