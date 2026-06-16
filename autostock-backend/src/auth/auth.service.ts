import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { role: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException();
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException();
    }

    const payload: JwtPayload = { userId: user.id, role: user.role.name };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }

  async refresh(dto: RefreshDto): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken);
      const accessToken = this.jwtService.sign(
        { userId: payload.userId, role: payload.role },
        { expiresIn: '15m' },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
