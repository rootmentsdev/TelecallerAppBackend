import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

// Common validators
const phoneValidator = body('phone_number')
  .optional()
  .trim()
  .matches(/^[0-9]{10}$/)
  .withMessage('Phone number must be 10 digits');

const dateValidator = (field) => body(field)
  .optional()
  .isISO8601()
  .withMessage(`${field} must be a valid ISO date format`)
  .toDate();

const leadIdValidator = param('id')
  .notEmpty()
  .withMessage('Lead ID is required')
  .custom((value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new Error('Invalid lead ID format');
    }
    return true;
  });

  export const leadGetValidator = [
    leadIdValidator
  ];

// Loss of Sale Page Validators
export const lossOfSaleGetValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    })
];

export const lossOfSalePostValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  body('call_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Call status must be a string'),
  body('lead_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead status must be a string'),
  dateValidator('follow_up_date'),
  body('reason_collected_from_store')
    .optional()
    .isString()
    .trim()
    .withMessage('Reason collected from store must be a string'),
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string')
];

// Rent-Out Page Validators
export const rentOutGetValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    })
];

export const rentOutPostValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  body('call_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Call status must be a string'),
  body('lead_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead status must be a string'),
  body('follow_up_flag')
    .optional()
    .isBoolean()
    .withMessage('Follow up flag must be a boolean'),
  dateValidator('call_date'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string')
];

// Booking Confirmation Page Validators
export const bookingConfirmationGetValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    })
];

export const bookingConfirmationPostValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  body('call_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Call status must be a string'),
  body('lead_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead status must be a string'),
  body('follow_up_flag')
    .optional()
    .isBoolean()
    .withMessage('Follow up flag must be a boolean'),
  dateValidator('call_date'),
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string')
];

// Just Dial Page Validators
export const justDialGetValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    })
];

export const justDialPostValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  body('call_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Call status must be a string'),
  body('lead_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead status must be a string'),
  body('closing_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Closing status must be a string'),
  body('reason')
    .optional()
    .isString()
    .trim()
    .withMessage('Reason must be a string'),
  body('follow_up_flag')
    .optional()
    .isBoolean()
    .withMessage('Follow up flag must be a boolean'),
  dateValidator('call_date'),
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string')
];

// Add Lead Page Validators
export const addLeadPostValidator = [
  body('customer_name')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isString()
    .withMessage('Customer name must be a string'),
  body('phone_number')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('brand')
    .optional()
    .isString()
    .trim()
    .withMessage('Brand must be a string'),
  body('store_location')
    .trim()
    .notEmpty()
    .withMessage('Store location is required')
    .isString()
    .withMessage('Store location must be a string'),
  body('lead_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead status must be a string'),
  body('call_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Call status must be a string'),
  dateValidator('follow_up_date')
];

// Generic lead update validator (for 'general' or unknown lead types)
export const leadUpdateValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid lead ID format');
      }
      return true;
    }),
  body('call_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Call status must be a string'),
  body('lead_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Lead status must be a string'),
  body('follow_up_flag')
    .optional()
    .isBoolean()
    .withMessage('Follow up flag must be a boolean'),
  dateValidator('follow_up_date'),
  dateValidator('call_date'),
  body('reason_collected_from_store')
    .optional()
    .isString()
    .trim()
    .withMessage('Reason collected from store must be a string'),
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string'),
  body('closing_status')
    .optional()
    .isString()
    .trim()
    .withMessage('Closing status must be a string'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
];

