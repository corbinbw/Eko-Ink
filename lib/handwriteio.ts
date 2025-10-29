/**
 * Handwrite.io API Client
 * Documentation: https://documentation.handwrite.io/
 */

const HANDWRITE_API_BASE = 'https://api.handwrite.io/v1';
const API_KEY = process.env.HANDWRITEIO_API_KEY;

interface HandwritingStyle {
  id: string;
  name: string;
  preview_url: string;
}

interface StationeryOption {
  id: string;
  name: string;
  size: string;
  preview_url: string;
}

interface RecipientAddress {
  firstName: string;
  lastName: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string; // 2-letter capitalized abbreviation
  zip: string; // 5 characters
}

interface SendLetterRequest {
  message: string; // Max 320 characters
  handwriting_id: string;
  card_id: string;
  recipient: RecipientAddress;
}

interface SendLetterResponse {
  order_id: string;
  status: 'processing' | 'written' | 'complete' | 'problem' | 'cancelled';
  created_at: string;
  estimated_delivery?: string;
  tracking_number?: string;
}

interface OrderStatus {
  order_id: string;
  status: 'processing' | 'written' | 'complete' | 'problem' | 'cancelled';
  created_at: string;
  updated_at: string;
  tracking_number?: string;
  estimated_delivery?: string;
  message: string;
  recipient: RecipientAddress;
}

class HandwriteIOClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || API_KEY || '';
    // Don't throw error during construction to allow build-time imports
    // Error will be thrown when actually trying to make API calls
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check for API key at request time, not construction time
    if (!this.apiKey) {
      throw new Error('Handwrite.io API key is required. Please set HANDWRITEIO_API_KEY environment variable.');
    }

    const url = `${HANDWRITE_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Handwrite.io API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
        console.error('Handwrite.io API error details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorJson,
          url,
        });
      } catch (e) {
        console.error('Handwrite.io API error details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url,
        });
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Get available handwriting styles
   */
  async getHandwritingStyles(): Promise<HandwritingStyle[]> {
    return this.request<HandwritingStyle[]>('/handwriting');
  }

  /**
   * Get available stationery/card options
   */
  async getStationery(): Promise<StationeryOption[]> {
    return this.request<StationeryOption[]>('/stationery');
  }

  /**
   * Send a handwritten letter
   */
  async sendLetter(params: SendLetterRequest): Promise<SendLetterResponse> {
    // Validate message length (320 character limit - Handwrite.io API limit)
    if (params.message.length > 320) {
      throw new Error(`Message must be 320 characters or less (currently ${params.message.length} characters)`);
    }

    // Validate state format
    if (!/^[A-Z]{2}$/.test(params.recipient.state)) {
      throw new Error('State must be 2-letter capitalized abbreviation (e.g., CA, NY)');
    }

    // Validate zip format
    if (!/^\d{5}$/.test(params.recipient.zip)) {
      throw new Error('Zip code must be 5 digits');
    }

    // TEST MODE: If enabled, return mock response instead of calling API
    if (process.env.HANDWRITEIO_TEST_MODE === 'true') {
      console.log('[TEST MODE] Skipping actual Handwrite.io API call. Returning mock response.');
      return {
        order_id: `TEST_${Date.now()}`,
        status: 'processing',
        created_at: new Date().toISOString(),
        estimated_delivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        tracking_number: 'TEST_TRACKING_123456789',
      };
    }

    // Format request according to Handwrite.io API documentation
    const requestBody = {
      message: params.message,
      handwriting: params.handwriting_id,
      card: params.card_id,
      recipients: [params.recipient],
    };

    return this.request<SendLetterResponse>('/send', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Get order status by order ID
   */
  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    return this.request<OrderStatus>(`/orders/${orderId}`);
  }
}

// Export singleton instance
export const handwriteIO = new HandwriteIOClient();

// Export types
export type {
  HandwritingStyle,
  StationeryOption,
  RecipientAddress,
  SendLetterRequest,
  SendLetterResponse,
  OrderStatus,
};
