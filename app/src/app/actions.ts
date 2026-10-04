'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError } from '@/lib/api-error';
import { serverRequest } from '@/lib/server-api';
import { clearSessionCookies, setSessionCookies } from '@/lib/session';

export interface AuthFormState {
  error?: string;
}

export interface OnboardingResult {
  error?: string;
}

interface AuthResponse {
  token: string;
}

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function loginUser(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readText(formData, 'email');
  const password = readText(formData, 'password');

  try {
    const res = await serverRequest<AuthResponse>('POST', '/auth/login', { email, password }, { authenticated: false });
    setSessionCookies(await cookies(), res.token);
  } catch (err: unknown) {
    return { error: messageOf(err, 'Failed to sign in. Please try again.') };
  }

  redirect('/today');
}

export async function signupUser(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = readText(formData, 'email');
  const password = readText(formData, 'password');
  const fullName = readText(formData, 'fullName');

  try {
    const res = await serverRequest<AuthResponse>('POST', '/auth/register', { email, password, fullName }, { authenticated: false });
    setSessionCookies(await cookies(), res.token);
  } catch (err: unknown) {
    return { error: messageOf(err, 'Failed to create account. Please try again.') };
  }

  redirect('/welcome');
}

export async function saveOnboarding(formData: FormData): Promise<OnboardingResult> {
  let categories: unknown;
  try {
    categories = JSON.parse(readText(formData, 'categories'));
  } catch {
    return { error: 'Please select at least one topic and try again.' };
  }

  try {
    await serverRequest('POST', '/ambition', {
      role: readText(formData, 'role'),
      activity: readText(formData, 'activity'),
      ambition: readText(formData, 'ambition'),
      direction: readText(formData, 'direction'),
      timeline: readText(formData, 'timeline'),
      categories,
      geography: readText(formData, 'geography'),
      depth: readText(formData, 'depth'),
      bidiLang: readText(formData, 'bidiLang'),
      reportLang: readText(formData, 'reportLang'),
    });
  } catch (err: unknown) {
    return { error: messageOf(err, 'Failed to save your ambition. Please try again.') };
  }

  redirect('/today');
}

export async function logoutUser(): Promise<{ success: boolean }> {
  clearSessionCookies(await cookies());
  return { success: true };
}
