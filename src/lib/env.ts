function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getRequiredPublicEnv(name: string) {
  return required(name, process.env[name]);
}

export function getRequiredServerEnv(name: string) {
  return required(name, process.env[name]);
}
