import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

export const createFollowUpValidator = [
  body('leadId')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  
  body('scheduledDate')
    .notEmpty()
    .withMessage('Scheduled date is required')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date')
    .toDate()
];

export const updateFollowUpStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage('Follow-up ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid follow-up ID format');
      }
      return true;
    }),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['pending', 'completed', 'cancelled'])
    .withMessage('Status must be pending, completed, or cancelled')
];

export const getFollowUpsValidator = [
  query('filter')
    .optional()
    .isIn(['today', 'upcoming', 'overdue'])
    .withMessage('Filter must be today, upcoming, or overdue')
];
