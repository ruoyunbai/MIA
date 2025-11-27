export class UserResponseDto {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
