import { Redirect } from 'expo-router';

/** Landing route for the OAuth deep link. The code is exchanged by the sign-in call, not here. */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
