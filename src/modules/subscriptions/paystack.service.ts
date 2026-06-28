import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface PaystackInitResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaystackVerifyResponse {
  status: string;
  reference: string;
  amount: number;
  paidAt: string;
  transactionId: number;
  customerEmail: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.getOrThrow<string>('PAYSTACK_SECRET_KEY');
  }

  /**
   * Initialize a Paystack transaction and return the checkout URL.
   */
  async initializeTransaction(params: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<PaystackInitResponse> {
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
      }),
    });

    const data = await response.json() as {
      status: boolean;
      message: string;
      data: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    if (!data.status) {
      throw new Error(`Paystack initialization failed: ${data.message}`);
    }

    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  }

  /**
   * Verify a transaction by reference after Paystack redirects back.
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      },
    );

    const data = await response.json() as {
      status: boolean;
      message: string;
      data: {
        status: string;
        reference: string;
        amount: number;
        paid_at: string;
        id: number;
        customer: { email: string };
        metadata: Record<string, unknown>;
      };
    };

    if (!data.status) {
      throw new Error(`Paystack verification failed: ${data.message}`);
    }

    return {
      status: data.data.status,
      reference: data.data.reference,
      amount: data.data.amount,
      paidAt: data.data.paid_at,
      transactionId: data.data.id,
      customerEmail: data.data.customer.email,
      metadata: data.data.metadata,
    };
  }

  /**
   * Verify the HMAC SHA-512 signature on an incoming Paystack webhook.
   * Returns true if the signature is valid.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }
}