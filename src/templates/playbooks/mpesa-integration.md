---
id: mpesa-integration
title: M-Pesa Integration Guide
description: Complete M-Pesa STK Push and C2B integration for Next.js applications
category: payment
tags: ["mpesa", "payment", "stk-push", "c2b", "daraja-api", "nextjs"]
author: MyContext
version: 1.0.0
createdAt: "2024-01-01T00:00:00.000Z"
updatedAt: "2024-01-01T00:00:00.000Z"
difficulty: intermediate
estimatedTime: "2-4 hours"
prerequisites:
  [
    "Next.js",
    "Safaricom Daraja API credentials",
    "Database (Supabase/PostgreSQL)",
  ]
relatedPlaybooks: ["stripe-integration", "payment-webhooks"]
---

# M-Pesa Integration Technical Guide

## Overview

This guide provides a comprehensive M-Pesa integration supporting both **STK Push** (Prompt-to-Pay) and **C2B** (Customer-to-Business) payment methods for Next.js applications.

## Prerequisites

- Safaricom Daraja API credentials (Consumer Key and Secret)
- Next.js application
- Database (Supabase/PostgreSQL recommended)
- HTTPS domain for callbacks

## Environment Setup

```bash
# Required environment variables
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_BUSINESS_SHORT_CODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/payment-callback
MPESA_C2B_VALIDATION_URL=https://your-domain.com/api/payment/c2b/validation
MPESA_C2B_CONFIRMATION_URL=https://your-domain.com/api/payment/c2b/confirmation
```

## Database Schema

### M-Pesa Transactions Table

```sql
CREATE TABLE mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id VARCHAR(255),
  merchant_request_id VARCHAR(255),
  order_id UUID REFERENCES orders(id),
  phone_number VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  actual_amount DECIMAL(10,2),
  account_reference VARCHAR(255),
  transaction_desc VARCHAR(255),
  mpesa_receipt_number VARCHAR(255),
  transaction_date VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  result_code INTEGER,
  result_desc VARCHAR(255),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### C2B Requests Table

```sql
CREATE TABLE mpesa_c2b_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(50),
  trans_id VARCHAR(255) UNIQUE,
  trans_time VARCHAR(20),
  trans_amount DECIMAL(10,2),
  business_short_code VARCHAR(20),
  bill_ref_number VARCHAR(255),
  invoice_number VARCHAR(255),
  org_account_balance DECIMAL(10,2),
  third_party_trans_id VARCHAR(255),
  msisdn VARCHAR(20),
  first_name VARCHAR(100),
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  request_type VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  reconciliation_status VARCHAR(50) DEFAULT 'unmatched',
  matched_order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## STK Push Implementation

### 1. STK Push Initiation API

```typescript
// app/api/payment/stk/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { orderId, phoneNumber, amount, accountReference } =
      await request.json();

    // Get M-Pesa configuration
    const mpesaConfig = {
      consumerKey: process.env.MPESA_CONSUMER_KEY!,
      consumerSecret: process.env.MPESA_CONSUMER_SECRET!,
      businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE!,
      passkey: process.env.MPESA_PASSKEY!,
      callbackUrl: process.env.MPESA_CALLBACK_URL!,
    };

    // Generate access token
    const accessToken = await generateAccessToken(
      mpesaConfig.consumerKey,
      mpesaConfig.consumerSecret
    );

    // Generate password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, -3);
    const password = Buffer.from(
      `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`
    ).toString("base64");

    // STK Push payload
    const stkPushPayload = {
      BusinessShortCode: mpesaConfig.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phoneNumber.replace("+", ""),
      PartyB: mpesaConfig.businessShortCode,
      PhoneNumber: phoneNumber.replace("+", ""),
      CallBackURL: mpesaConfig.callbackUrl,
      AccountReference: accountReference || `ORDER-${orderId}`,
      TransactionDesc: "Payment",
    };

    // Make API call to M-Pesa
    const response = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPushPayload),
      }
    );

    const result = await response.json();

    if (result.ResponseCode === "0") {
      // Store transaction in database
      await storeTransaction({
        checkoutRequestId: result.CheckoutRequestID,
        merchantRequestId: result.MerchantRequestID,
        orderId,
        phoneNumber,
        amount,
        accountReference,
        status: "pending",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("STK Push error:", error);
    return NextResponse.json({ error: "STK Push failed" }, { status: 500 });
  }
}

async function generateAccessToken(
  consumerKey: string,
  consumerSecret: string
): Promise<string> {
  const response = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${consumerKey}:${consumerSecret}`
        ).toString("base64")}`,
      },
    }
  );

  const data = await response.json();
  return data.access_token;
}
```

### 2. STK Push Callback Processing

```typescript
// app/api/payment-callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle different callback structures
    let stkCallback;
    if (body.Body && body.Body.stkCallback) {
      stkCallback = body.Body.stkCallback;
    } else if (body.stkCallback) {
      stkCallback = body.stkCallback;
    } else if (body.Body) {
      stkCallback = body.Body;
    } else {
      stkCallback = body;
    }

    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } =
      stkCallback;

    if (ResultCode === 0) {
      // Payment successful
      const metadata = CallbackMetadata?.Item || [];
      const getMetadataValue = (name: string) =>
        metadata.find((item: any) => item.Name === name)?.Value;

      const amount = getMetadataValue("Amount");
      const mpesaReceiptNumber = getMetadataValue("MpesaReceiptNumber");
      const transactionDate = getMetadataValue("TransactionDate");
      const phoneNumber = getMetadataValue("PhoneNumber");

      // Update transaction record
      await updateTransaction(CheckoutRequestID, {
        mpesa_receipt_number: mpesaReceiptNumber,
        transaction_date: transactionDate,
        actual_amount: amount,
        status: "completed",
        result_code: ResultCode,
        result_desc: ResultDesc,
      });

      // Update order status
      await updateOrderStatus(CheckoutRequestID, {
        payment_status: "paid",
        mpesa_receipt_number: mpesaReceiptNumber,
      });
    } else {
      // Payment failed
      await updateTransaction(CheckoutRequestID, {
        status: "failed",
        result_code: ResultCode,
        result_desc: ResultDesc,
        error_message: ResultDesc,
      });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error("Callback processing error:", error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Error" },
      { status: 500 }
    );
  }
}
```

## C2B Implementation

### 1. C2B Validation

```typescript
// app/api/payment/c2b/validation/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = await request.json();

    // Amount validation
    const amount = parseFloat(TransAmount);
    if (amount < 10) {
      return NextResponse.json({
        ResultCode: "C2B00012",
        ResultDesc: "Amount below minimum threshold",
      });
    }

    if (amount > 100000) {
      return NextResponse.json({
        ResultCode: "C2B00013",
        ResultDesc: "Amount above maximum threshold",
      });
    }

    // Business shortcode validation
    const isValidShortcode = await validateBusinessShortcode(BusinessShortCode);
    if (!isValidShortcode) {
      return NextResponse.json({
        ResultCode: "C2B00014",
        ResultDesc: "Invalid business shortcode",
      });
    }

    return NextResponse.json({
      ResultCode: "0",
      ResultDesc: "Accepted",
    });
  } catch (error) {
    console.error("C2B validation error:", error);
    return NextResponse.json({
      ResultCode: "C2B00015",
      ResultDesc: "Validation error",
    });
  }
}
```

### 2. C2B Confirmation

```typescript
// app/api/payment/c2b/confirmation/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = await request.json();

    // Check for duplicate processing
    const existingRequest = await getC2BRequest(TransID);
    if (existingRequest) {
      return NextResponse.json({
        ResultCode: "0",
        ResultDesc: "Already processed",
      });
    }

    // Store C2B request
    await storeC2BRequest({
      transactionType: TransactionType,
      transId: TransID,
      transTime: TransTime,
      transAmount: parseFloat(TransAmount),
      businessShortCode: BusinessShortCode,
      billRefNumber: BillRefNumber,
      invoiceNumber: InvoiceNumber,
      orgAccountBalance: parseFloat(OrgAccountBalance),
      thirdPartyTransId: ThirdPartyTransID,
      msisdn: MSISDN,
      firstName: FirstName,
      middleName: MiddleName,
      lastName: LastName,
      requestType: "confirmation",
      status: "pending",
    });

    // Attempt to match with existing order
    const matchedOrder = await matchPaymentWithOrder({
      phoneNumber: MSISDN,
      amount: parseFloat(TransAmount),
      billRefNumber: BillRefNumber,
    });

    if (matchedOrder) {
      await updateC2BRequest(TransID, {
        reconciliationStatus: "matched",
        matchedOrderId: matchedOrder.id,
      });

      await updateOrderStatus(matchedOrder.id, {
        payment_status: "paid",
        mpesa_receipt_number: TransID,
      });
    }

    return NextResponse.json({
      ResultCode: "0",
      ResultDesc: "Success",
    });
  } catch (error) {
    console.error("C2B confirmation error:", error);
    return NextResponse.json({
      ResultCode: "1",
      ResultDesc: "Error",
    });
  }
}
```

## Frontend Integration

### Payment Component

```typescript
// components/PaymentForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess: (receiptNumber: string) => void;
  onError: (error: string) => void;
}

export function PaymentForm({
  orderId,
  amount,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSTKPush = async () => {
    if (!phoneNumber) {
      onError("Phone number is required");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/payment/stk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          phoneNumber,
          amount,
          accountReference: `ORDER-${orderId}`,
        }),
      });

      const result = await response.json();

      if (result.ResponseCode === "0") {
        // Start polling for payment status
        pollPaymentStatus(orderId);
      } else {
        onError(result.ResponseDescription || "Payment initiation failed");
      }
    } catch (error) {
      onError("Network error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const pollPaymentStatus = async (orderId: string) => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(`/api/payment/status?orderId=${orderId}`);
        const status = await response.json();

        if (status.payment_status === "paid") {
          clearInterval(interval);
          onSuccess(status.mpesa_receipt_number);
        } else if (status.payment_status === "failed") {
          clearInterval(interval);
          onError("Payment failed");
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          onError("Payment timeout");
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          onError("Status check failed");
        }
      }
    }, 10000); // Check every 10 seconds
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+254712345678"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">
          Amount: KES {amount.toLocaleString()}
        </p>
        <Button onClick={handleSTKPush} disabled={isLoading} className="w-full">
          {isLoading ? "Processing..." : "Pay with M-Pesa"}
        </Button>
      </div>
    </div>
  );
}
```

## Error Handling

### Common M-Pesa Error Codes

```typescript
const errorMessages = {
  1032: "Payment cancelled by user",
  1037: "User timeout - no response",
  1: "Insufficient balance",
  2001: "Invalid PIN entered",
  1019: "Transaction expired",
  1001: "User busy - another transaction in progress",
  1025: "Request processing error",
  9999: "System error",
};

export function getErrorMessage(resultCode: number): string {
  return errorMessages[resultCode] || "Unknown error occurred";
}
```

## Security Best Practices

1. **Validate all inputs** - Sanitize phone numbers and amounts
2. **Use HTTPS only** - Secure all payment endpoints
3. **Implement rate limiting** - Prevent abuse of payment endpoints
4. **Log all transactions** - Maintain audit trail
5. **Validate callbacks** - Verify webhook authenticity
6. **Store sensitive data securely** - Use environment variables

## Testing

### Test STK Push

```typescript
// Test STK Push with sandbox
const testSTKPush = async () => {
  const response = await fetch("/api/payment/stk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: "test-order-123",
      phoneNumber: "+254708374149", // Test number
      amount: 100,
      accountReference: "TEST-123",
    }),
  });

  return response.json();
};
```

## Monitoring

### Key Metrics to Track

- Transaction success rate
- Average processing time
- Error rates by type
- Payment completion rates
- Callback processing time

### Database Queries

```sql
-- Success rate
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
FROM mpesa_transactions
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Error analysis
SELECT result_desc, COUNT(*) as count
FROM mpesa_transactions
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY result_desc
ORDER BY count DESC;
```

## Troubleshooting

### Common Issues

1. **STK Push Timeout**

   - Check network connectivity
   - Verify callback URL accessibility
   - Check M-Pesa service status

2. **C2B Payment Not Matching**

   - Verify phone number format
   - Check amount precision
   - Review matching strategies

3. **Configuration Errors**
   - Validate environment variables
   - Check business shortcode
   - Verify API credentials

This playbook provides a complete, production-ready M-Pesa integration that can be used as a reference for any Next.js application requiring mobile payment functionality.
