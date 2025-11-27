import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @ValidateIf((dto: SendEmailDto) => !dto.html)
  @IsString()
  @IsNotEmpty()
  text?: string;

  @ValidateIf((dto: SendEmailDto) => !dto.text)
  @IsString()
  @IsNotEmpty()
  html?: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @IsOptional()
  @IsEmail()
  replyTo?: string;
}
