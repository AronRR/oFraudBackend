/* eslint-disable prettier/prettier */

import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { diskStorage } from "multer";
import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { extname, join } from "path";

const UPLOAD_FOLDER = join(__dirname, "..", "..", "public", "uploads");
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Controller("files")
export class FileController {
    constructor(private readonly configService: ConfigService) {}

    @Post("upload")
    @UseGuards(JwtAuthGuard)
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
        fileFilter: (req, file, cb) => {
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                cb(new BadRequestException("Tipo de archivo no permitido"), false);
                return;
            }
            cb(null, true);
        },
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
