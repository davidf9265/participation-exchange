import { IsDecimal, ValidateBy, type ValidationOptions } from 'class-validator';
import { Prisma } from '../../generated/prisma/client';

/** Strictly greater than zero. Assumes the value already passed IsDecimal. */
function IsPositiveDecimal(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isPositiveDecimal',
      validator: {
        validate: (value: unknown): boolean => {
          if (typeof value !== 'string') return false;
          try {
            return new Prisma.Decimal(value).gt(0);
          } catch {
            return false;
          }
        },
        defaultMessage: () => 'amount must be greater than 0',
      },
    },
    validationOptions,
  );
}

/**
 * The buyer is never accepted from the client: it is the viewer's credit union.
 * The listing comes from the route. Any other body field is stripped by the
 * global whitelist.
 */
export class CreateParticipationDto {
  @IsDecimal({ decimal_digits: '0,2' })
  @IsPositiveDecimal()
  amount!: string;
}
