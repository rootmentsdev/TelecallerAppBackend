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

// Validator for GET /api/pages/leads query parameters
export const leadsListValidator = [
  query('leadType')
    .optional()
    .isIn(['lossOfSale', 'return', 'justDial', 'general', 'enquiry'])
    .withMessage('leadType must be one of: lossOfSale, return, justDial, general, enquiry'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be between 1 and 1000')
    .toInt(),
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
    .withMessage('Remarks must be a string'),
  body('call_duration')
    .optional()
    .isNumeric()
    .withMessage('Call duration must be a number (seconds)')
    .toFloat()
];

// Return Page Validators
export const returnGetValidator = [
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

export const returnPostValidator = [
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
  body('remarks')
    .optional()
    .isString()
    .trim()
    .withMessage('Remarks must be a string'),
  body('call_duration')
    .optional()
    .isNumeric()
    .withMessage('Call duration must be a number (seconds)')
    .toFloat()
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
    .withMessage('Remarks must be a string'),
  body('call_duration')
    .optional()
    .isNumeric()
    .withMessage('Call duration must be a number (seconds)')
    .toFloat()
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
  dateValidator('follow_up_date'),
  body('follow_up_flag')
    .optional()
    .isBoolean()
    .withMessage('follow_up_flag must be a boolean'),
  body('mark_as_complaint')
    .optional()
    .isBoolean()
    .withMessage('mark_as_complaint must be a boolean'),
  body('leadType')
    .optional()
    .isString()
    .trim(),
  dateValidator('functionDate'),
  body('subCategory')
    .optional()
    .isString()
    .trim(),
  body('itemCategory')
    .optional()
    .isString()
    .trim(),
  body('closingAction')
    .optional()
    .isString()
    .trim(),
  body('remarks')
    .optional()
    .isString()
    .trim(),
  body('reasons')
    .optional()
    .isString()
    .trim()
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
  body('call_duration')
    .optional()
    .isNumeric()
    .withMessage('Call duration must be a number (seconds)')
    .toFloat()
];

