import { body } from 'express-validator';

export const registerValidator = [
  body('employeeId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('store')
    .trim()
    .notEmpty()
    .withMessage('Store is required'),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be 10 digits')
];

export const loginValidator = [
  body('employeeId')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];
