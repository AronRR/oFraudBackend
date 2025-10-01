import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_MIME_TYPES,
  SUPPORTED_MEDIA_TYPES_DESCRIPTION,
  fileTypeFilter,
  isAllowedMimeType,
} from './file.controller';

describe('FileController configuration', () => {
  it('includes required video mime types', () => {
    expect(ALLOWED_MIME_TYPES).toEqual(expect.arrayContaining(['video/mp4', 'video/webm']));
  });

  it('allows configured video mime types', () => {
    expect(isAllowedMimeType('video/mp4')).toBe(true);
    expect(isAllowedMimeType('video/webm')).toBe(true);
  });

  it('rejects unsupported mime types', () => {
    expect(isAllowedMimeType('application/pdf')).toBe(false);
  });

  it('invokes the file filter callback with an error for unsupported mime types', () => {
    const callback = jest.fn();

    fileTypeFilter({} as any, { mimetype: 'application/pdf' } as Express.Multer.File, callback);

    expect(callback).toHaveBeenCalledTimes(1);
    const [error, acceptFile] = callback.mock.calls[0];
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      message: `Tipo de archivo no permitido. Solo se permiten ${SUPPORTED_MEDIA_TYPES_DESCRIPTION}.`,
    });
    expect(acceptFile).toBe(false);
  });

  it('accepts supported video mime types through the filter', () => {
    const callback = jest.fn();

    fileTypeFilter({} as any, { mimetype: 'video/webm' } as Express.Multer.File, callback);

    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
