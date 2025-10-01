/* eslint-disable prettier/prettier */

import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import type { Request } from "express";
import { diskStorage } from "multer";
import type { FileFilterCallback } from "multer";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";

const UPLOAD_FOLDER = join(__dirname, "..", "..", "public", "uploads");
export const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/webm",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export const SUPPORTED_MEDIA_TYPES_DESCRIPTION = "imágenes (JPEG, PNG, WEBP) y videos (MP4, WEBM)";
export const isAllowedMimeType = (mimetype: string): mimetype is AllowedMimeType =>
    (ALLOWED_MIME_TYPES as readonly string[]).includes(mimetype);
export const fileTypeFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!isAllowedMimeType(file.mimetype)) {
        cb(
            new BadRequestException(
                `Tipo de archivo no permitido. Solo se permiten ${SUPPORTED_MEDIA_TYPES_DESCRIPTION}.`,
            ),
            false,
        );
        return;
    }
    cb(null, true);
};
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Controller("files")
@ApiTags("Files")
export class FileController {
    constructor(private readonly configService: ConfigService) {}

    @Post("upload")
    @UseGuards(JwtAuthGuard)
    @ApiOperation({
        summary: "Subir archivo multimedia",
        description: `Permite subir ${SUPPORTED_MEDIA_TYPES_DESCRIPTION}.`,
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                file: {
                    type: "string",
                    format: "binary",
                    description: `Archivo a cargar. Tipos permitidos: ${SUPPORTED_MEDIA_TYPES_DESCRIPTION}.`,
                },
            },
            required: ["file"],
        },
    })
    @ApiCreatedResponse({
        description: `Archivo subido correctamente. Tipos soportados: ${SUPPORTED_MEDIA_TYPES_DESCRIPTION}.`,
        schema: {
            type: "object",
            properties: {
                filename: { type: "string" },
                path: { type: "string" },
            },
        },
    })
    @ApiBadRequestResponse({
        description: `Tipo de archivo no permitido. Solo se permiten ${SUPPORTED_MEDIA_TYPES_DESCRIPTION}.`,
    })
    @UseInterceptors(FileInterceptor("file", {
        storage: diskStorage({
            destination: (req, file, cb) => {
                if (!existsSync(UPLOAD_FOLDER)) {
                    mkdirSync(UPLOAD_FOLDER, { recursive: true });
                }
                cb(null, UPLOAD_FOLDER);
            },
            filename: (req, file, cb) => {
                const extension = extname(file.originalname) || "";
                const uniqueName = `${randomUUID()}-${Date.now()}${extension}`;
                cb(null, uniqueName);
            },
        }),
        limits: {
            fileSize: MAX_FILE_SIZE_BYTES,
        },
        fileFilter: fileTypeFilter,
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException("No se cargó ningún archivo");
        }

        const appUrl = this.configService.get<string>("APP_URL") ?? "http://localhost:3000";
        const normalizedBaseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;

        return {
            filename: file.filename,
            path: `${normalizedBaseUrl}/public/uploads/${file.filename}`,
        };
    }
}
