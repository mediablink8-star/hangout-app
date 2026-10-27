import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'hangout.session-token';

export async function readToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function writeToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}
