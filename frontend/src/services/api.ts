import { InquiryFormData, ApiResponse } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || '';

export async function submitInquiry(data: InquiryFormData): Promise<ApiResponse> {
  const url = `${API_BASE}/api/v1/inquiries`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Failed to submit inquiry. Please try again.');
  }

  return result;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
