import { UserResponseDto } from '../../users/dto/user-response.dto';

export class LoginResponseDto {
  token: string;
  user: UserResponseDto;
}
