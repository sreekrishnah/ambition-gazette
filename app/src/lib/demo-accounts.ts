// Demo personas for recording and walkthroughs. The chips render only when NEXT_PUBLIC_DEMO_MODE is "true".
export interface DemoAccount {
  key: string;
  label: string;
  email: string;
  password: string;
}

const DEMO_PASSWORD = 'Gazette-Demo-2026';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { key: 'student', label: 'Student', email: 'ananya.krishnan@ambitiongazette.demo', password: DEMO_PASSWORD },
  { key: 'switch', label: 'Career Switch', email: 'joe.bradski@ambitiongazette.demo', password: DEMO_PASSWORD },
  { key: 'founder', label: 'Founder', email: 'mery.george@ambitiongazette.demo', password: DEMO_PASSWORD },
];
