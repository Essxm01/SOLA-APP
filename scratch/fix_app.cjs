const fs = require('fs');
const path = 'C:/Users/Essam/OneDrive/Desktop/SOLA - RENTAL APP/backend/server/src/app.ts';
let code = fs.readFileSync(path, 'utf8');

const regexAvailability = /\/\/\s*4\.2\s*Property Details \([^)]+\)[\s\S]*?(?=if \(path\.startsWith\('\/api\/v1\/customer\/properties\/'\))/;

if (code.includes('4.2a Property Availability')) {
  console.log('Availability already exists');
} else {
  code = code.replace(
    /(\/\/\s*4\.2\s*Property Details[^]*?)if\s*\(path\.startsWith\('\/api\/v1\/customer\/properties\/'\)\s*&&\s*method\s*===\s*'GET'\)\s*\{/,
    `// 4.2a Property Availability
        if (path.match(/^\\/api\\/v1\\/customer\\/properties\\/[^\\/]+\\/availability$/) && method === 'GET') {
          const propertyId = path.split('/')[5];
          const blocks = await bookingDb.getBlocksByPropertyId(propertyId).catch(() => []);
          const prop = await propertyDb.getById(propertyId).catch(() => null);
          return {
            statusCode: 200,
            body: {
              success: true,
              data: {
                propertyId,
                unavailableRanges: blocks.map((b) => ({
                  checkIn: typeof b.checkIn === 'string' ? b.checkIn : b.checkIn.toISOString().slice(0, 10),
                  checkOut: typeof b.checkOut === 'string' ? b.checkOut : b.checkOut.toISOString().slice(0, 10),
                })),
                minStay: prop?.houseRules?.minStay || 1,
                maxStay: prop?.houseRules?.maxStay || 30
              },
              timestamp,
            },
          };
        }

        $1if (path.match(/^\\/api\\/v1\\/customer\\/properties\\/[^\\/]+$/) && method === 'GET') {`
  );
}

// 4.3 Calculate
code = code.replace(
  /(\/\/\s*4\.3\s*Customer Booking Preview[^]*?if\s*\(path\s*===\s*'\/api\/v1\/customer\/bookings\/calculate'\s*&&\s*method\s*===\s*'POST'\)\s*\{)[\s\S]*?(?=\/\/\s*4\.4\s*Customer Booking Creation Foundation)/,
  `$1
          const { propertyId, checkIn, checkOut, guests } = bodyPayload || {};
          
          if (!propertyId || !checkIn || !checkOut || !guests) {
            return {
              statusCode: 400,
              body: { success: false, error: { code: 'MISSING_FIELDS', message: 'يرجى تقديم بيانات الحجز كاملة' }, timestamp },
            };
          }

          const prop = await propertyDb.getById(propertyId).catch(() => null);
          if (!prop) {
            return {
              statusCode: 404,
              body: { success: false, error: { code: 'PROPERTY_NOT_FOUND', message: 'الوحدة غير موجودة' }, timestamp },
            };
          }

          const blocks = await bookingDb.getBlocksByPropertyId(propertyId).catch(() => []);
          const checkInDate = new Date(checkIn + 'T00:00:00');
          const checkOutDate = new Date(checkOut + 'T00:00:00');
          let overlap = false;
          for (const b of blocks) {
            const bIn = new Date(b.checkIn + 'T00:00:00');
            const bOut = new Date(b.checkOut + 'T00:00:00');
            if (checkInDate < bOut && checkOutDate > bIn) {
               overlap = true; break;
            }
          }
          if (overlap) {
            return {
              statusCode: 409,
              body: { success: false, error: { code: 'DATE_OVERLAP', message: 'التواريخ المطلوبة محجوزة مسبقاً' }, timestamp },
            };
          }

          const propWithPrice = {
            ...prop,
            basePricePerNight: Number(prop.basePricePerNight || prop.pricePerNight || 5000),
          };

          try {
            const validated = CustomerDomainController.validateCustomerBookingRequest(propWithPrice, checkIn, checkOut, guests);
            const breakdown = calculateBookingFinancials(validated.totalBookingValue, validated.firstNightPrice);

            return {
              statusCode: 200,
              body: {
                success: true,
                data: {
                  propertyId,
                  checkIn,
                  checkOut,
                  guests,
                  nights: validated.nights,
                  pricePerNight: validated.firstNightPrice,
                  totalBookingValue: breakdown.totalBookingValueInCents / 100,
                  depositAmount: breakdown.depositAmountInCents / 100,
                  solaCommissionAmount: breakdown.solaCommissionInCents / 100,
                  ownerNetDepositAmount: breakdown.ownerNetDepositInCents / 100,
                  remainingBalance: breakdown.remainingBalanceInCents / 100,
                  commissionOnRemainingBalance: 0,
                },
                timestamp,
              },
            };
          } catch (e) {
            return {
              statusCode: 400,
              body: { success: false, error: { code: 'VALIDATION_ERROR', message: e.message }, timestamp },
            };
          }
        }

        `
);

// 4.4 Booking Creation
code = code.replace(
  /(\/\/\s*4\.4\s*Customer Booking Creation Foundation[^]*?if\s*\(path\s*===\s*'\/api\/v1\/customer\/bookings'\s*&&\s*method\s*===\s*'POST'\)\s*\{)[\s\S]*?(?=\/\/\s*4\.5\s*Customer Bookings Fetch)/,
  `$1
          const { propertyId, checkIn, checkOut, totalGuests } = bodyPayload || {};

          if (!propertyId || !checkIn || !checkOut || !totalGuests) {
            return {
              statusCode: 400,
              body: { success: false, error: { code: 'MISSING_BOOKING_FIELDS', message: 'مطلوب تفاصيل الحجز وتواريخ الإقامة' }, timestamp },
            };
          }

          const prop = await propertyDb.getById(propertyId).catch(() => null);
          if (!prop) {
            return {
              statusCode: 404,
              body: { success: false, error: { code: 'PROPERTY_NOT_FOUND', message: 'الوحدة غير موجودة' }, timestamp },
            };
          }

          if (prop.status !== 'PUBLISHED') {
            return {
              statusCode: 403,
              body: { success: false, error: { code: 'UNPUBLISHED_PROPERTY', message: 'الوحدة غير متاحة للحجز' }, timestamp },
            };
          }

          const blocks = await bookingDb.getBlocksByPropertyId(propertyId).catch(() => []);
          const checkInDate = new Date(checkIn + 'T00:00:00');
          const checkOutDate = new Date(checkOut + 'T00:00:00');
          let overlap = false;
          for (const b of blocks) {
            const bIn = new Date(b.checkIn + 'T00:00:00');
            const bOut = new Date(b.checkOut + 'T00:00:00');
            if (checkInDate < bOut && checkOutDate > bIn) {
               overlap = true; break;
            }
          }
          if (overlap) {
            return {
              statusCode: 409,
              body: { success: false, error: { code: 'DATE_OVERLAP', message: 'التواريخ المطلوبة محجوزة مسبقاً' }, timestamp },
            };
          }

          const propWithPrice = {
            ...prop,
            basePricePerNight: Number(prop.basePricePerNight || prop.pricePerNight || 5000),
          };

          try {
            const validated = CustomerDomainController.validateCustomerBookingRequest(propWithPrice, checkIn, checkOut, totalGuests);
            const breakdown = calculateBookingFinancials(validated.totalBookingValue, validated.firstNightPrice);

            const bookingId = crypto.randomUUID();
            const bookingNumber = \`BK-\${Date.now().toString().slice(-6)}\`;
            const createdIso = timestamp;
            const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

            await bookingDb.create({
              id: bookingId,
              bookingNumber,
              propertyId,
              ownerId: prop.ownerId || '00000000-0000-0000-0000-000000000001',
              guestName: 'Sola Customer',
              guestPhone: customerPhone,
              checkIn,
              checkOut,
              nights: validated.nights,
              totalGuests,
              status: 'PENDING_OWNER_APPROVAL',
            }).catch(() => null);

            return {
              statusCode: 201,
              body: {
                success: true,
                data: {
                  id: bookingId,
                  bookingNumber,
                  propertyId,
                  ownerId: prop.ownerId || 'owner-001',
                  customerId,
                  guestName: 'Sola Customer',
                  guestPhone: customerPhone,
                  checkIn,
                  checkOut,
                  nights: validated.nights,
                  totalGuests,
                  status: 'PENDING_OWNER_APPROVAL',
                  createdAt: createdIso,
                  expiredAt: expiresIso,
                  financialSummary: {
                    totalBookingValue: breakdown.totalBookingValueInCents / 100,
                    depositAmount: breakdown.depositAmountInCents / 100,
                    depositPaymentStatus: 'NOT_DUE',
                    solaCommissionAmount: breakdown.solaCommissionInCents / 100,
                    ownerNetDepositAmount: breakdown.ownerNetDepositInCents / 100,
                    remainingBalance: breakdown.remainingBalanceInCents / 100,
                    remainingBalancePaymentMethod: 'CASH_ON_ARRIVAL',
                    remainingBalanceStatus: 'NOT_DUE',
                    ownerPayoutStatus: 'OWNER_PAYOUT_PENDING',
                    currency: 'EGP',
                  },
                },
                timestamp,
              },
            };
          } catch (e) {
            return {
              statusCode: 400,
              body: { success: false, error: { code: 'VALIDATION_ERROR', message: e.message }, timestamp },
            };
          }
        }

        `
);

fs.writeFileSync(path, code);
console.log('App.ts updated successfully.');
