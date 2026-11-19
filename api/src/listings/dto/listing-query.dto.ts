import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class ListingQueryDto {
  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  grade?: 'A' | 'B' | 'C' | 'D';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minYield?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  maxTermMonths?: number;
}
