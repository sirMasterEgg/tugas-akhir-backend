import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as moment from 'moment';

@ValidatorConstraint({ name: 'validStringDate', async: false })
export class ValidStringDate implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments) {
    return moment(text, 'DD-MM-YYYY', true).isValid();
  }

  defaultMessage(args: ValidationArguments) {
    return "'$value' is Invalid Date Format";
  }
}
