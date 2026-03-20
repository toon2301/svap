import {
  getCompanyDisplayName,
  getIndividualDisplayName,
  getProfileDisplayName,
} from '../profileDisplayName';

describe('profileDisplayName', () => {
  it('uses personal first_name + last_name for individual accounts', () => {
    expect(
      getProfileDisplayName({
        user_type: 'individual',
        username: 'anton-user',
        first_name: 'Anton',
        last_name: 'Chudjačik',
        company_name: 'Studio Anton',
      }),
    ).toBe('Anton Chudjačik');
  });

  it('uses company_name only for company accounts', () => {
    expect(
      getProfileDisplayName({
        user_type: 'company',
        username: 'anton-user',
        first_name: 'Anton',
        last_name: 'Chudjačik',
        company_name: 'Studio Anton',
      }),
    ).toBe('Studio Anton');
  });

  it('falls back to username when company account has no company_name', () => {
    expect(
      getCompanyDisplayName({
        user_type: 'company',
        username: 'anton-user',
        first_name: 'Anton',
        last_name: 'Chudjačik',
        company_name: '',
      }),
    ).toBe('anton-user');
  });

  it('falls back to username when individual account has no personal name', () => {
    expect(
      getIndividualDisplayName({
        user_type: 'individual',
        username: 'anton-user',
        first_name: '',
        last_name: '',
        company_name: 'Studio Anton',
      }),
    ).toBe('anton-user');
  });
});
