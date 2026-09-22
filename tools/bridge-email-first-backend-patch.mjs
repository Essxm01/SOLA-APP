import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const { oldValue, newValue, label } of transforms) {
    const first = source.indexOf(oldValue);
    if (first < 0) throw new Error(`${path} ${label}: anchor not found`);
    if (source.indexOf(oldValue, first + oldValue.length) >= 0) throw new Error(`${path} ${label}: anchor not unique`);
    source = source.slice(0, first) + newValue + source.slice(first + oldValue.length);
  }
  fs.writeFileSync(path, source);
}

patchFile('backend/server/src/contracts/customerRenter.ts', [
  {
    label: 'CustomerProfileDto phone becomes nullable',
    oldValue: `export interface CustomerProfileDto {\n  id: string;\n  phoneNumber: string;`,
    newValue: `export interface CustomerProfileDto {\n  id: string;\n  phoneNumber: string | null;`,
  },
  {
    label: 'Customer profile parser accepts null phone only',
    oldValue: `  const phoneNumber = requiredString(raw.phoneNumber ?? raw.phone_number, 'CUSTOMER_PROFILE_DATA', 'phoneNumber');`,
    newValue: `  const phoneNumber = optionalString(raw.phoneNumber ?? raw.phone_number, 'CUSTOMER_PROFILE_DATA', 'phoneNumber');`,
  },
]);

patchFile('backend/server/src/tests/p22RenterApiContract.test.ts', [{
  label: 'Customer profile nullable phone coverage',
  oldValue: `// Profile fail closed on malformed required fields\nassert.throws(() => toCustomerProfileDto({ ...rawUser, id: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);\nassert.throws(() => toCustomerProfileDto({ ...rawUser, phoneNumber: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);\nassert.throws(() => toCustomerProfileDto({ ...rawUser, status: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);\n\n// Canonical null profile fields remain null\nconst nullProfileDto = toCustomerProfileDto({\n  ...rawUser,\n  fullName: null,\n  email: null,\n  phoneVerifiedAt: null,\n});\nassert.equal(nullProfileDto.fullName, null);\nassert.equal(nullProfileDto.email, null);\nassert.equal(nullProfileDto.phoneVerifiedAt, null);`,
  newValue: `// Profile fail closed on malformed required fields / malformed non-null phone.\nassert.throws(() => toCustomerProfileDto({ ...rawUser, id: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);\nassert.throws(() => toCustomerProfileDto({ ...rawUser, phoneNumber: { invalid: true }, phone_number: undefined }), /MALFORMED_CUSTOMER_PROFILE_DATA/);\nassert.throws(() => toCustomerProfileDto({ ...rawUser, status: '' }), /MALFORMED_CUSTOMER_PROFILE_DATA/);\n\n// Canonical nullable Customer identity fields remain null. Email-only accounts\n// are valid after migration 032 and must not need a fake phone.\nconst nullProfileDto = toCustomerProfileDto({\n  ...rawUser,\n  phoneNumber: null,\n  phone_number: null,\n  fullName: 'عميل بريد',\n  email: 'email.only@example.com',\n  phoneVerifiedAt: null,\n});\nassert.equal(nullProfileDto.phoneNumber, null);\nassert.equal(nullProfileDto.email, 'email.only@example.com');\nassert.equal(nullProfileDto.phoneVerifiedAt, null);`,
}]);

console.log('Applied bounded nullable Customer profile patches');
