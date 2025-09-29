/* eslint-disable prettier/prettier */

import { AccessPayload } from "src/auth/tokens.service";
import { Request } from "express";

export interface AuthenticatedUser{
    userId: string;
    role: AccessPayload["profile"]["role"];
    profile: AccessPayload["profile"];
    raw: AccessPayload;
}

export interface AuthenticatedRequest extends Request{
    user: AuthenticatedUser
}
