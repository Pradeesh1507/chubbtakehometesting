import { faker } from '@faker-js/faker';

/**
 * Test data builders for E2E tests
 * Uses Faker for realistic, randomized data
 */

export interface ClaimFormData {
  incidentType: string;
  incidentDate: string;
  incidentLocation: string;
  description: string;
  claimAmount: string;
  policyNumber: string;
  termsAccepted: boolean;
}

export interface TestUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
}

/**
 * Generate valid claim form data
 */
export function buildClaimData(overrides?: Partial<ClaimFormData>): ClaimFormData {
  return {
    incidentType: 'AUTO_ACCIDENT',
    incidentDate: faker.date.past({ years: 1 }).toISOString().split('T')[0],
    incidentLocation: faker.location.streetAddress(),
    description: faker.lorem.sentences(3),
    claimAmount: faker.number.int({ min: 1000, max: 50000 }).toString(),
    policyNumber: `POL-${faker.string.alphanumeric(8).toUpperCase()}`,
    termsAccepted: true,
    ...overrides,
  };
}

/**
 * Generate valid test user data
 */
export function buildTestUser(overrides?: Partial<TestUserData>): TestUserData {
  return {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: 'ValidPassword123!',
    ...overrides,
  };
}

/**
 * Build invalid claim data for validation testing
 */
export function buildInvalidClaimData(scenario: 'emptyDescription' | 'invalidAmount'): Partial<ClaimFormData> {
  if (scenario === 'emptyDescription') {
    return {
      incidentType: 'AUTO_ACCIDENT',
      incidentDate: new Date().toISOString().split('T')[0],
      description: '', // Invalid - required field
      claimAmount: '5000',
      policyNumber: 'POL-12345678',
    };
  }

  if (scenario === 'invalidAmount') {
    return {
      incidentType: 'AUTO_ACCIDENT',
      incidentDate: new Date().toISOString().split('T')[0],
      description: faker.lorem.sentences(2),
      claimAmount: '-100', // Invalid - negative amount
      policyNumber: 'POL-12345678',
    };
  }

  return {};
}

/**
 * Build invalid user data for signup validation testing
 */
export function buildInvalidUserData(scenario: 'invalidEmail' | 'weakPassword'): Partial<TestUserData> {
  if (scenario === 'invalidEmail') {
    return {
      name: faker.person.fullName(),
      email: 'not-an-email', // Invalid email format
      password: 'ValidPassword123!',
    };
  }

  if (scenario === 'weakPassword') {
    return {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      password: '123', // Too weak
    };
  }

  return {};
}
