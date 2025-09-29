import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UpdateUserProfileDto } from 'src/users/dto/update-user-profile.dto';
import { UserResponseDto } from 'src/users/dto/user-response.dto';
import { User, UserRepository } from 'src/users/user.repository';
import { UserController } from 'src/users/user.controller';
import { UserService } from 'src/users/user.service';

jest.mock('src/common/guards/jwt-auth.guard', () => {
  const { Injectable } = require('@nestjs/common');
  @Injectable()
  class MockJwtAuthGuard {
    canActivate(context: { switchToHttp: () => { getRequest: () => any } }): boolean {
      const req = context.switchToHttp().getRequest();
      req.user = {
        userId: '1',
        role: 'user',
        profile: {
          id: '1',
          email: 'user@example.com',
          name: 'User Example',
          role: 'user',
        },
      };
      return true;
    }
  }
  return { JwtAuthGuard: MockJwtAuthGuard };
});

describe('UserController (e2e)', () => {
  let app: INestApplication | undefined;
  let userRepository: jest.Mocked<UserRepository>;

  const baseUser: User = {
    id: 1,
    email: 'user@example.com',
    username: 'user123',
    first_name: 'User',
    last_name: 'Example',
    phone_number: null,
    password_hash: 'hash',
    password_salt: 'salt',
    role: 'user',
    is_blocked: 0,
    blocked_reason: null,
    blocked_by: null,
    blocked_at: null,
    privacy_accepted_at: null,
    community_rules_accepted_at: null,
    last_login_at: null,
    created_at: new Date('2025-09-28T10:00:00.000Z'),
    updated_at: new Date('2025-09-28T10:00:00.000Z'),
    deleted_at: null,
  };

  beforeEach(async () => {
    userRepository = {
      registerUser: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      recordBlockedLoginAttempt: jest.fn(),
      updateProfile: jest.fn(),
      updatePassword: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        { provide: UserRepository, useValue: userRepository },
        JwtAuthGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('POST /users returns sanitized payload', async () => {
    userRepository.registerUser.mockImplementation(async (data) => ({
      ...baseUser,
      ...data,
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number ?? null,
    }));

    const payload: CreateUserDto = {
      email: 'new-user@example.com',
      username: 'newuser',
      firstName: 'New',
      lastName: 'User',
      phoneNumber: '+34123456789',
      password: 'StrongPass123',
      role: 'user',
    };

    const response = await request(app!.getHttpServer()).post('/users').send(payload).expect(201);

    const expected: UserResponseDto = {
      id: baseUser.id,
      email: payload.email,
      username: payload.username,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.phoneNumber,
      role: payload.role ?? 'user',
      isBlocked: false,
      blockedReason: null,
      blockedBy: null,
      blockedAt: null,
    };

    expect(response.body).toEqual(expected);
    expect(response.body.password_hash).toBeUndefined();
    expect(response.body.password_salt).toBeUndefined();

    expect(userRepository.registerUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: payload.email,
        username: payload.username,
        first_name: payload.firstName,
        last_name: payload.lastName,
      }),
    );
  });

  it('PATCH /users/me returns sanitized payload', async () => {
    userRepository.updateProfile.mockImplementation(async () => ({
      ...baseUser,
      username: 'updateduser',
      first_name: 'Updated',
      last_name: 'Name',
      phone_number: '+34999888777',
    }));

    const payload: UpdateUserProfileDto = {
      username: 'updateduser',
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+34999888777',
    };

    const response = await request(app!.getHttpServer()).patch('/users/me').send(payload).expect(200);

    expect(response.body).toEqual({
      id: baseUser.id,
      email: baseUser.email,
      username: 'updateduser',
      firstName: 'Updated',
      lastName: 'Name',
      phoneNumber: '+34999888777',
      role: baseUser.role,
      isBlocked: false,
      blockedReason: null,
      blockedBy: null,
      blockedAt: null,
    });

    expect(response.body.password_hash).toBeUndefined();
    expect(response.body.password_salt).toBeUndefined();

    expect(userRepository.updateProfile).toHaveBeenCalledWith(1, {
      username: 'updateduser',
      first_name: 'Updated',
      last_name: 'Name',
      phone_number: '+34999888777',
    });
  });
});
