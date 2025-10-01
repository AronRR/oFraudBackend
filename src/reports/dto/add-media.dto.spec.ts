import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AddMediaDto } from './add-media.dto';

describe('AddMediaDto', () => {
  const basePayload = {
    revisionId: 1,
    fileUrl: 'http://example.com/file.png',
  } satisfies Partial<AddMediaDto>;

  it('accepts valid video media types', async () => {
    const dto = plainToInstance(AddMediaDto, {
      ...basePayload,
      mediaType: 'video',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects unsupported media types', async () => {
    const dto = plainToInstance(AddMediaDto, {
      ...basePayload,
      mediaType: 'file',
    });

    const errors = await validate(dto);
    const mediaTypeError = errors.find((error) => error.property === 'mediaType');

    expect(mediaTypeError).toBeDefined();
    expect(mediaTypeError?.constraints?.isIn).toContain('image');
  });
});
