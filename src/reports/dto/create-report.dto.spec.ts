import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateReportDto } from './create-report.dto';

describe('CreateReportDto', () => {
  const basePayload = {
    categoryId: 1,
    description: 'Descripción del incidente',
    incidentUrl: 'http://example.com/caso',
  } satisfies Partial<CreateReportDto>;

  it('accepts reports with video media entries', async () => {
    const dto = plainToInstance(CreateReportDto, {
      ...basePayload,
      media: [
        {
          fileUrl: 'http://example.com/video.mp4',
          mediaType: 'video',
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects reports with unsupported media types', async () => {
    const dto = plainToInstance(CreateReportDto, {
      ...basePayload,
      media: [
        {
          fileUrl: 'http://example.com/document.pdf',
          mediaType: 'document',
        },
      ],
    });

    const errors = await validate(dto);
    const mediaErrors = errors.find((error) => error.property === 'media');
    const mediaTypeError = mediaErrors?.children?.[0]?.children?.find(
      (child) => child.property === 'mediaType',
    );

    expect(mediaErrors).toBeDefined();
    expect(mediaTypeError?.constraints?.isIn).toContain('image');
  });
});
