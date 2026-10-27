// Web sessions remain in memory; SecureStore is only available on native platforms.
export async function readToken() {
  return null;
}

export async function writeToken(_token: string | null) {
  return;
}
