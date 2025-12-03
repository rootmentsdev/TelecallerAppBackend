import { body, param } from 'express-validator';
import mongoose from 'mongoose';

export const createLeadValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits'),
  
  body('store')
    .trim()
    .notEmpty()
    .withMessage('Store is required'),
  
  body('leadType')
    .optional()
    .isIn(['lossOfSale', 'rentOutFeedback', 'bookingConfirmation', 'justDial', 'general'])
    .withMessage('Invalid lead type')
];

export const updateLeadValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  
  body('callStatus')
    .optional()
    .isString()
    .withMessage('Call status must be a string'),
  
  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Follow-up date must be a valid ISO date')
    .toDate()
];
