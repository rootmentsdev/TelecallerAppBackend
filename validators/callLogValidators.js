import { body } from 'express-validator';
import mongoose from 'mongoose';

export const createCallLogValidator = [
  body('leadId')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  
  body('callStatus')
    .notEmpty()
    .withMessage('Call status is required')
    .isIn(['Connected', 'Not Connected', 'Call Back Later', 'Confirmed / Converted', 'Cancelled / Rejected'])
    .withMessage('Invalid call status'),
  
  body('durationSeconds')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive integer')
    .toInt()
];
